package main

import (
	"github.com/evanw/esbuild/pkg/api"
	"github.com/rs/zerolog/log"
)

func main() {
	options := api.BuildOptions{
		EntryPoints: []string{"src/background.js", "src/content.js"},
		Outdir:      ".",
		Bundle:      true,
		// Minify:      true,
		Sourcemap: api.SourceMapNone,
		Format:    api.FormatESModule,
		Target:    api.ES2017,
		Write:     true,
	}

	result := api.Build(options)
	if len(result.Errors) > 0 {
		log.Error().Interface("errors", result.Errors).Msg("Errors in building files.")
	} else {
		log.Info().Msg("Build succeeded.")
	}
}
