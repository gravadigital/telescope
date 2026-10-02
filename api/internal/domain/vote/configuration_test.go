package vote

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVotingBounds(t *testing.T) {
	tests := []struct {
		k                        int
		minM, maxM, recommendedM int
	}{
		{0, 0, 0, 0},
		{1, 0, 0, 0},
		{2, 1, 1, 1},
		{3, 2, 2, 2},
		{4, 2, 3, 3},
		{10, 6, 9, 7},
		{16, 8, 15, 8},
	}
	for _, tt := range tests {
		minM, maxM, recommendedM := VotingBounds(tt.k)
		assert.Equal(t, [3]int{tt.minM, tt.maxM, tt.recommendedM}, [3]int{minM, maxM, recommendedM}, "k=%d", tt.k)
	}
}

func ptr[T any](v T) *T { return &v }

func TestBuildVotingConfiguration_AppliesDefaults(t *testing.T) {
	eventID := uuid.New()
	cfg, err := BuildVotingConfiguration(eventID, ConfigInput{AttachmentsPerEvaluator: 2}, 3)
	require.NoError(t, err)

	assert.NotEqual(t, uuid.Nil, cfg.ID)
	assert.Equal(t, eventID, cfg.EventID)
	assert.Equal(t, 2, cfg.AttachmentsPerEvaluator)
	assert.Equal(t, 0.6, cfg.QualityGoodThreshold)
	assert.Equal(t, 0.3, cfg.QualityBadThreshold)
	assert.Equal(t, 3, cfg.AdjustmentMagnitude)
	assert.Equal(t, 2, cfg.MinEvaluationsPerFile)
}

func TestBuildVotingConfiguration_DefaultMinEvaluationsCapsAtThree(t *testing.T) {
	cfg, err := BuildVotingConfiguration(uuid.New(), ConfigInput{AttachmentsPerEvaluator: 3}, 4)
	require.NoError(t, err)
	assert.Equal(t, 3, cfg.MinEvaluationsPerFile)

	cfg, err = BuildVotingConfiguration(uuid.New(), ConfigInput{AttachmentsPerEvaluator: 7}, 10)
	require.NoError(t, err)
	assert.Equal(t, 3, cfg.MinEvaluationsPerFile)
}

func TestBuildVotingConfiguration_Errors(t *testing.T) {
	tests := []struct {
		name string
		in   ConfigInput
		k    int
		want error
	}{
		{"equal thresholds", ConfigInput{AttachmentsPerEvaluator: 2, QualityGoodThreshold: ptr(0.5), QualityBadThreshold: ptr(0.5)}, 3, ErrInvalidThresholds},
		{"gap below 0.1 against default", ConfigInput{AttachmentsPerEvaluator: 2, QualityGoodThreshold: ptr(0.35)}, 3, ErrInvalidThresholds},
		{"inverted thresholds", ConfigInput{AttachmentsPerEvaluator: 2, QualityGoodThreshold: ptr(0.3), QualityBadThreshold: ptr(0.6)}, 3, ErrInvalidThresholds},
		{"gap 0.05", ConfigInput{AttachmentsPerEvaluator: 2, QualityGoodThreshold: ptr(0.65), QualityBadThreshold: ptr(0.6)}, 3, ErrInvalidThresholds},
		{"m above k-1", ConfigInput{AttachmentsPerEvaluator: 3}, 3, ErrMExceedsEvaluable},
		{"m below min", ConfigInput{AttachmentsPerEvaluator: 1}, 3, ErrMathConstraint},
		{"coverage", ConfigInput{AttachmentsPerEvaluator: 2, MinEvaluationsPerFile: ptr(3)}, 3, ErrMathConstraint},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := BuildVotingConfiguration(uuid.New(), tt.in, tt.k)
			require.Error(t, err)
			assert.True(t, errors.Is(err, tt.want), "got %v", err)
		})
	}
}

func TestBuildVotingConfiguration_ThresholdGapBorder(t *testing.T) {
	cfg, err := BuildVotingConfiguration(uuid.New(), ConfigInput{AttachmentsPerEvaluator: 2, QualityGoodThreshold: ptr(0.7), QualityBadThreshold: ptr(0.6)}, 3)
	require.NoError(t, err)
	assert.Equal(t, 0.7, cfg.QualityGoodThreshold)
	assert.Equal(t, 0.6, cfg.QualityBadThreshold)
}

func TestBuildVotingConfiguration_ExplicitZeroIsRespected(t *testing.T) {
	cfg, err := BuildVotingConfiguration(uuid.New(), ConfigInput{AttachmentsPerEvaluator: 2, QualityBadThreshold: ptr(0.0)}, 3)
	require.NoError(t, err)
	assert.Equal(t, 0.0, cfg.QualityBadThreshold)
}
