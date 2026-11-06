package event

import "slices"

// CoverColor identifies the cover color of an event, one of a closed palette of 16 pastels.
//
// The identifiers and their order are a contract: web renders each one with its own token
// (docs/design-system/web/foundations/color.md) and the events.valid_cover_color CHECK
// repeats the same list. Renaming or removing one needs a data migration.
type CoverColor string

const (
	CoverColorLavender   CoverColor = "lavender"
	CoverColorPeriwinkle CoverColor = "periwinkle"
	CoverColorSky        CoverColor = "sky"
	CoverColorIce        CoverColor = "ice"
	CoverColorAqua       CoverColor = "aqua"
	CoverColorMint       CoverColor = "mint"
	CoverColorPistachio  CoverColor = "pistachio"
	CoverColorLemon      CoverColor = "lemon"
	CoverColorButter     CoverColor = "butter"
	CoverColorPeach      CoverColor = "peach"
	CoverColorCoral      CoverColor = "coral"
	CoverColorRose       CoverColor = "rose"
	CoverColorPink       CoverColor = "pink"
	CoverColorLilac      CoverColor = "lilac"
	CoverColorSand       CoverColor = "sand"
	CoverColorMist       CoverColor = "mist"
)

// DefaultCoverColor is the cover color of an event nobody chose one for.
const DefaultCoverColor = CoverColorLavender

// CoverColors returns the palette in canonical order. The slice is a copy.
func CoverColors() []CoverColor {
	return []CoverColor{
		CoverColorLavender, CoverColorPeriwinkle, CoverColorSky, CoverColorIce,
		CoverColorAqua, CoverColorMint, CoverColorPistachio, CoverColorLemon,
		CoverColorButter, CoverColorPeach, CoverColorCoral, CoverColorRose,
		CoverColorPink, CoverColorLilac, CoverColorSand, CoverColorMist,
	}
}

// IsValid reports whether the color belongs to the palette.
func (c CoverColor) IsValid() bool {
	return slices.Contains(CoverColors(), c)
}
