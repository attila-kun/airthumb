package main

import (
	"context"
	"encoding/json"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/pkgerrors"
	"github.com/spf13/cobra"
)

func main() {
	logger := getLog()
	ctx := logger.WithContext(context.Background())
	var rootCmd = &cobra.Command{Use: "app"}

	// Define a string flag for environment
	var env string
	rootCmd.PersistentFlags().StringVarP(&env, "env", "e", "dev", "Set the environment")

	var buildCmd = &cobra.Command{
		Use:   "build",
		Short: "Build the project",
		Run: func(cmd *cobra.Command, args []string) {
			build(ctx, getOptions(ctx, env))
		},
	}

	var watchCmd = &cobra.Command{
		Use:   "watch",
		Short: "Watch the project files",
		Run: func(cmd *cobra.Command, args []string) {
			watch(ctx, getOptions(ctx, env))
		},
	}

	var releaseCmd = &cobra.Command{
		Use:   "release",
		Short: "Package the extension into a zip file",
		RunE: func(cmd *cobra.Command, args []string) error {
			return release(ctx, env)
		},
	}

	rootCmd.AddCommand(buildCmd, watchCmd, releaseCmd)
	rootCmd.Execute()
}

func getLog() zerolog.Logger {
	zerolog.ErrorStackMarshaler = pkgerrors.MarshalStack
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix

	logger := zerolog.New(
		zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339Nano,
			NoColor:    os.Getenv("LOG_NO_COLOR") == "true",
		},
	).With().Timestamp().Caller().Stack().Logger()

	return logger
}

func getOptions(
	ctx context.Context,
	env string,
) api.BuildOptions {
	return api.BuildOptions{
		EntryPoints: []string{
			"./src/manifest.json",
			"./src/background.ts",
			"./src/content.ts",
			"./src/content.css",
			"./src/web_accessible_resources/images/logo.png",
		},
		Outdir:    "dist",
		Bundle:    true,
		Sourcemap: api.SourceMapNone,
		Format:    api.FormatESModule,
		Target:    api.ES2017,
		Write:     true,
		LogLevel:  api.LogLevelDebug,
		Plugins: []api.Plugin{
			environmentPlugin(ctx, env),
			copyPlugin(ctx, `manifest.json$`),
			copyPlugin(ctx, `logo.png$`),
			timestampPlugin(),
		},
	}
}

func environmentPlugin(
	ctx context.Context,
	env string,
) api.Plugin {
	logger := zerolog.Ctx(ctx)
	return api.Plugin{
		Name: "environment-plugin",
		Setup: func(build api.PluginBuild) {
			build.OnLoad(api.OnLoadOptions{Filter: `environment.json$`}, func(args api.OnLoadArgs) (api.OnLoadResult, error) {

				// logger.Fatal().Msg("hello")

				// Modify the file path to include the environment name
				envFilename := strings.Replace(args.Path, "environment.json", "environment_"+env+".json", 1)

				// Read the environment-specific JSON file
				contentBytes, err := os.ReadFile(filepath.Clean(envFilename))
				if err != nil {
					logger.Error().Str("path", envFilename).Msg("failed to read environment file")
					return api.OnLoadResult{}, err
				}
				contents := string(contentBytes)

				// Return the contents to be used by the build
				return api.OnLoadResult{
					Contents: &contents,
					Loader:   api.LoaderJSON,
				}, nil
			})
		},
	}
}

func copyPlugin(
	ctx context.Context,
	filter string,
) api.Plugin {
	logger := zerolog.Ctx(ctx)
	return api.Plugin{
		Name: "json-plugin",
		Setup: func(build api.PluginBuild) {
			build.OnLoad(api.OnLoadOptions{Filter: filter}, func(args api.OnLoadArgs) (api.OnLoadResult, error) {
				// Read the file content
				contentBytes, err := os.ReadFile(args.Path)
				if err != nil {
					logger.Fatal().Str("path", args.Path).Msg("failed to read file")
					return api.OnLoadResult{}, err
				}
				contents := string(contentBytes)
				return api.OnLoadResult{
					Contents: &contents,
					Loader:   api.LoaderCopy,
				}, nil
			})
		},
	}
}

func timestampPlugin() api.Plugin {
	return api.Plugin{
		Name: "timestamp-plugin",
		Setup: func(build api.PluginBuild) {
			build.OnEnd(func(result *api.BuildResult) (api.OnEndResult, error) {
				if len(result.Errors) == 0 {
					timestamp := map[string]int64{
						"timestamp": time.Now().UnixMilli(),
					}
					data, err := json.Marshal(timestamp)
					if err != nil {
						return api.OnEndResult{}, err
					}
					filePath := filepath.Join("dist", "timestamp.json")
					if err := os.WriteFile(filePath, data, 0644); err != nil {
						return api.OnEndResult{}, err
					}
					if err != nil {
						return api.OnEndResult{}, err
					}
				}
				return api.OnEndResult{}, nil
			})
		},
	}
}

func build(ctx context.Context, options api.BuildOptions) {
	logger := zerolog.Ctx(ctx)
	result := api.Build(options)
	if len(result.Errors) > 0 {
		logger.Fatal().Interface("errors", result.Errors).Msg("Errors in building files.")
	} else {
		logger.Info().Msg("Build succeeded.")
	}
}

func watch(ctx context.Context, options api.BuildOptions) {
	logger := zerolog.Ctx(ctx)
	esbuildCtx, esbuildCtxErr := api.Context(options)
	if esbuildCtxErr != nil {
		logger.Fatal().Err(esbuildCtxErr).Msg("Could not create esbuild context.")
	}

	err := esbuildCtx.Watch(api.WatchOptions{})
	if err != nil {
		logger.Fatal().Err(err).Msg("Could not watch")
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)
	sig := <-done
	logger.Info().Msgf("Shutting down gracefully, received signal: %v", sig)
	esbuildCtx.Dispose()
}
