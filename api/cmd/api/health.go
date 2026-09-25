package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// healthHandler answers GET /health. version is the one the binary was built with
// (main.version), so a deployment can be asked which release it runs. checkDB returns
// nil when the database answers, or an error whose message is the reported reason.
func healthHandler(version string, checkDB func() error) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := checkDB(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "error",
				"service": "telescopio-api",
				"version": version,
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"service":  "telescopio-api",
			"version":  version,
			"database": "connected",
		})
	}
}
