# Addon Icons

This directory should contain the following icon files for the Firefox addon:

## Required Icons

- `icon-19.png` - 19x19 pixels (toolbar icon)
- `icon-38.png` - 38x38 pixels (toolbar icon @2x)
- `icon-48.png` - 48x48 pixels (addon management page)
- `icon-96.png` - 96x96 pixels (addon management page @2x)

## Icon Specifications

- **Format**: PNG with transparency
- **Style**: Simple, recognizable design that represents account selection
- **Colors**: Use colors that work well with Firefox's theme
- **Design**: Consider using a simple icon like a user silhouette with arrows or checkmarks

## Creating Icons

You can create these icons using:
- Online icon generators
- Graphic design software (GIMP, Photoshop, Figma)
- Icon libraries (FontAwesome, Material Icons)

## Placeholder Icons

If you don't have custom icons yet, you can:
1. Use a simple emoji or symbol
2. Create basic geometric shapes
3. Use online icon generators to create placeholder icons

## Testing

After adding icons, test them by:
1. Building the addon: `npm run build`
2. Loading it in Firefox via `about:debugging`
3. Checking that icons appear in the toolbar and addon management page
