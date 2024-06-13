package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

func main() {
	ctx := log.Logger.WithContext(context.Background())
	var rootCmd = &cobra.Command{Use: "app"}

	options := api.BuildOptions{
		EntryPoints: []string{"src/background.js", "src/content.js"},
		Outdir:      "dist",
		Bundle:      true,
		Sourcemap:   api.SourceMapNone,
		Format:      api.FormatESModule,
		Target:      api.ES2017,
		Write:       true,
	}

	var buildCmd = &cobra.Command{
		Use:   "build",
		Short: "Build the project",
		Run: func(cmd *cobra.Command, args []string) {
			build(ctx, options)
		},
	}

	var watchCmd = &cobra.Command{
		Use:   "watch",
		Short: "Watch the project files",
		Run: func(cmd *cobra.Command, args []string) {
			watch(ctx, options)
		},
	}

	rootCmd.AddCommand(buildCmd, watchCmd)
	rootCmd.Execute()
}

func build(ctx context.Context, options api.BuildOptions) {
	logger := zerolog.Ctx(ctx)
	result := api.Build(options)
	if len(result.Errors) > 0 {
		logger.Error().Interface("errors", result.Errors).Msg("Errors in building files.")
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
