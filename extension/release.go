package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/rs/zerolog"
)

func release(ctx context.Context, env string) error {
	logger := zerolog.Ctx(ctx)
	logger.Info().Msg("Build start")

	manifestPath := filepath.Join("src", "manifest.json")
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to read manifest.json")
		return err
	}

	var manifest struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		logger.Error().Err(err).Msg("Failed to parse manifest.json")
		return err
	}

	if err := os.RemoveAll("dist"); err != nil {
		logger.Error().Err(err).Msg("Failed to remove existing dist directory")
		return err
	}

	build(ctx, getOptions(ctx, env)) // Assuming the build function setups the dist directory correctly

	packageDir := fmt.Sprintf("dist_package/airthumb-v%s.zip", manifest.Version)
	if err := os.MkdirAll(filepath.Dir(packageDir), 0755); err != nil {
		logger.Error().Err(err).Msg("Failed to create package directory")
		return err
	}

	// Create zip archive
	out, err := os.Create(packageDir)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to create output zip file")
		return err
	}
	defer out.Close()

	archive := zip.NewWriter(out)
	defer archive.Close()

	// Add dist directory to zip
	if err := addFilesToZip(archive, "dist", ""); err != nil {
		logger.Error().Err(err).Msg("Failed to add files to zip")
		return err
	}

	logger.Info().Msg("Build end")
	return nil
}

func addFilesToZip(zipWriter *zip.Writer, basePath, baseInZip string) error {
	files, err := os.ReadDir(basePath)
	if err != nil {
		return err
	}

	for _, file := range files {
		if file.IsDir() {
			newBase := filepath.Join(basePath, file.Name())
			if err := addFilesToZip(zipWriter, newBase, filepath.Join(baseInZip, file.Name())); err != nil {
				return err
			}
		} else {
			filePath := filepath.Join(basePath, file.Name())
			data, err := os.ReadFile(filePath)
			if err != nil {
				return err
			}
			f, err := zipWriter.Create(filepath.Join(baseInZip, file.Name()))
			if err != nil {
				return err
			}
			_, err = f.Write(data)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
