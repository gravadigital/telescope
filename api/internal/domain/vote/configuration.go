package vote

import (
	"errors"
	"fmt"
	"math"

	"github.com/google/uuid"
)

const (
	DefaultQualityGoodThreshold  = 0.6
	DefaultQualityBadThreshold   = 0.3
	DefaultAdjustmentMagnitude   = 3
	DefaultMinEvaluationsPerFile = 3

	// minThresholdGapCents mirrors the valid_quality_thresholds CHECK (0.1),
	// compared in hundredths because the column is decimal(3,2).
	minThresholdGapCents = 10
)

var (
	ErrInvalidThresholds = errors.New("invalid quality thresholds")
	ErrMExceedsEvaluable = errors.New("attachments per evaluator exceeds evaluable proposals")
	ErrMathConstraint    = errors.New("voting configuration violates mathematical constraints")
)

// ConfigInput carries the organizer's choices; nil fields take the default.
type ConfigInput struct {
	AttachmentsPerEvaluator int
	QualityGoodThreshold    *float64
	QualityBadThreshold     *float64
	AdjustmentMagnitude     *int
	MinEvaluationsPerFile   *int
}

// VotingBounds returns the accepted range for m given k proposals, where
// evaluators are exactly the participants who own one of them.
func VotingBounds(k int) (minM, maxM, recommendedM int) {
	maxM = max(k-1, 0)
	if maxM == 0 {
		return 0, 0, 0
	}
	recommendedM = min(int(math.Ceil(2*math.Log2(float64(k)))), maxM)
	minM = recommendedM
	if k <= 10 {
		minM = min(minM, int(math.Ceil(float64(maxM)*0.6)))
	}
	return minM, maxM, recommendedM
}

// BuildVotingConfiguration applies defaults and validates the result against
// k proposals, with n = k evaluators.
func BuildVotingConfiguration(eventID uuid.UUID, in ConfigInput, k int) (*VotingConfiguration, error) {
	m := in.AttachmentsPerEvaluator
	cfg := &VotingConfiguration{
		ID:                      uuid.New(),
		EventID:                 eventID,
		AttachmentsPerEvaluator: m,
		QualityGoodThreshold:    DefaultQualityGoodThreshold,
		QualityBadThreshold:     DefaultQualityBadThreshold,
		AdjustmentMagnitude:     DefaultAdjustmentMagnitude,
		MinEvaluationsPerFile:   min(DefaultMinEvaluationsPerFile, m),
	}
	if in.QualityGoodThreshold != nil {
		cfg.QualityGoodThreshold = *in.QualityGoodThreshold
	}
	if in.QualityBadThreshold != nil {
		cfg.QualityBadThreshold = *in.QualityBadThreshold
	}
	if in.AdjustmentMagnitude != nil {
		cfg.AdjustmentMagnitude = *in.AdjustmentMagnitude
	}
	if in.MinEvaluationsPerFile != nil {
		cfg.MinEvaluationsPerFile = *in.MinEvaluationsPerFile
	}

	good := int(math.Round(cfg.QualityGoodThreshold * 100))
	bad := int(math.Round(cfg.QualityBadThreshold * 100))
	if good <= bad || good-bad < minThresholdGapCents {
		return nil, fmt.Errorf("%w: good=%v bad=%v (good must exceed bad by at least 0.1)",
			ErrInvalidThresholds, cfg.QualityGoodThreshold, cfg.QualityBadThreshold)
	}

	minM, maxM, _ := VotingBounds(k)
	if m > maxM {
		return nil, fmt.Errorf("%w: m=%d, maximum %d for %d proposals", ErrMExceedsEvaluable, m, maxM, k)
	}
	if m < minM {
		return nil, fmt.Errorf("%w: m=%d, minimum %d for %d proposals", ErrMathConstraint, m, minM, k)
	}
	if need := k * cfg.MinEvaluationsPerFile; k*m < need {
		return nil, fmt.Errorf("%w: insufficient total evaluations, need %d, have %d", ErrMathConstraint, need, k*m)
	}
	return cfg, nil
}
