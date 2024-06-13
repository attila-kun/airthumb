package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	ctx := log.Logger.WithContext(context.Background())

	options := api.BuildOptions{
		EntryPoints: []string{"src/background.js", "src/content.js"},
		Outdir:      "dist",
		Bundle:      true,
		// Minify:      true,
		Sourcemap: api.SourceMapNone,
		Format:    api.FormatESModule,
		Target:    api.ES2017,
		Write:     true,
	}

	// TODO: use cobra to multiplex
	if true {
		build(ctx, options)
	} else {
		watch(ctx, options)
	}
}

func build(
	ctx context.Context,
	options api.BuildOptions,
) {
	logger := zerolog.Ctx(ctx)

	result := api.Build(options)
	if len(result.Errors) > 0 {
		logger.Error().Interface("errors", result.Errors).Msg("Errors in building files.")
	} else {
		logger.Info().Msg("Build succeeded.")
	}
}

func watch(
	ctx context.Context,
	options api.BuildOptions,
) {
	logger := zerolog.Ctx(ctx)

	esbuildCtx, esbuildCtxErr := api.Context(options)
	if esbuildCtxErr != nil {
		logger.Fatal().Err(esbuildCtxErr).Msg("Could not create esbuild context.")
	}

	err := esbuildCtx.Watch(api.WatchOptions{})
	if err != nil {
		logger.Fatal().Err(err).Msg("Couild not watch")
	}

	// Channel to wait for termination signal
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	// Block until a signal is received
	sig := <-done
	logger.Info().Msgf("Shutting down gracefully, received signal: %v", sig)

	// Dispose of the watch to clean up resources
	esbuildCtx.Dispose()
}
