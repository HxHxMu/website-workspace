# Design Fundamentals Reference

## 1. Color Theory

### Color Wheel & Properties
- **Hue**: The pure color (red, blue, yellow, etc.)
- **Saturation**: Intensity of the color (0% = gray, 100% = pure)
- **Value/Brightness**: Lightness or darkness (0% = black, 100% = white)
- **Temperature**: Warm (red, orange, yellow) vs. cool (blue, green, purple)

### Color Modification
- **Tint**: Color + white (lighter, less saturated)
- **Tone**: Color + gray (muted, sophisticated)
- **Shade**: Color + black (darker, deeper)

### Color Harmony Schemes
- **Monochrome**: Single hue, varying tints/tones/shades
- **Analogous**: 2-3 colors adjacent on color wheel (~60° apart)
- **Complementary**: Opposite colors on wheel (high contrast, vibrant)
- **Triadic**: 3 colors equally spaced on wheel (balanced, dynamic)

### Color Psychology
- **Red**: Energy, passion, urgency, danger
- **Orange**: Warmth, enthusiasm, friendliness
- **Yellow**: Optimism, clarity, caution
- **Green**: Growth, health, calm, nature
- **Blue**: Trust, stability, professionalism, sadness
- **Purple**: Creativity, luxury, mystery
- **Black**: Power, elegance, formality
- **White**: Purity, clarity, minimalism, emptiness

### Contrast & Accessibility
- **WCAG AA**: 4.5:1 contrast ratio for text (normal), 3:1 for large text
- **WCAG AAA**: 7:1 for normal text, 4.5:1 for large text
- Test with color blindness simulators (deuteranopia, protanopia, tritanopia)
- Never rely on color alone to convey information

---

## 2. Typography

### Typeface Selection
- **Serif**: Traditional, formal, readable in print (Georgia, Times New Roman, Garamond)
- **Sans-serif**: Modern, clean, screen-friendly (Helvetica, Arial, Inter, Roboto)
- **Monospace**: Code, technical (Courier, Consolas, Fira Code)
- **Display**: Headlines, branding (decorative, limited use)

### Font Properties
- **Weight**: Thickness (100 thin → 900 black, typically use 400, 500, 600, 700)
- **Style**: Italics, oblique (for emphasis or differentiation)
- **Letter spacing**: Tracking, adjust for readability (tighter for headlines, looser for body)
- **Line height**: 1.4–1.6 for body text (accessibility), 1–1.2 for headlines
- **Font size**: Base 16px minimum for body, scale headings (h1 2–3x base, h2 1.5–2x, etc.)

### Text Hierarchy
- Use size, weight, and color to establish importance
- Establish clear heading levels (h1 → h6, no gaps)
- Limit to 2–3 typefaces max (1 serif + 1 sans, or 1 main + 1 accent)
- Maintain consistent spacing between text elements

### Legibility Principles
- Adequate contrast (see Contrast & Accessibility above)
- Sufficient letter/word spacing to prevent crowding
- Line length 45–75 characters for body text (optimal reading)
- Avoid all-caps for long passages (harder to read)
- Sufficient line height to prevent visual congestion

### Typography Schema
- Define a type scale (e.g., 12px, 14px, 16px, 18px, 24px, 32px, 48px)
- Assign to semantic roles (body, caption, label, h1–h6)
- Document font stacks and fallbacks
- Specify line heights and letter spacing per role

---

## 3. Visual Hierarchy

### Core Principles
- **Size**: Larger elements attract attention first (headlines before body text)
- **Color**: Saturated, warm, or contrasting colors stand out
- **Contrast**: High contrast creates emphasis (dark on light, vice versa)
- **Proximity**: Elements grouped together are perceived as related
- **Alignment**: Creates order and reduces cognitive load
- **Consistency**: Repeated patterns reinforce importance (e.g., all buttons styled the same)

### Negative Space (Whitespace)
- Breathing room around elements improves scannability
- Increases perceived value and luxury (premium design)
- Reduces cognitive overload
- Use consistently for visual cohesion

### Visual Weight & Balance
- **Symmetrical**: Mirror layout, formal, stable (centered, predictable)
- **Asymmetrical**: Varied distribution, dynamic, engaging (offset focal points)
- **Radial**: Circular arrangement, less common but eye-catching

### Visual Harmony
- Colors work well together (see Color Harmony Schemes)
- Typography scale feels natural (avoid jarring jumps)
- Spacing feels intentional (use a base unit: 8px, 16px, etc.)
- Imagery style consistent (all photos, all illustrations, mixed intentionally)

---

## 4. Component Patterns

### Interactive Components

#### Buttons
- **States**: Default, hover, active, disabled, loading, focus (keyboard)
- **Hierarchy**: Primary (main action), secondary (alternative), tertiary (low priority)
- **Sizes**: Small, medium, large (match content density)
- **Accessibility**: Min 44x44px touch target, clear focus state, label clarity

#### Form Inputs
- **Text inputs**: Placeholder text, validation states (error, success, warning)
- **Checkboxes**: Independent selections, group with fieldset/legend
- **Radio buttons**: Mutually exclusive options, group by name
- **Textarea**: Multi-line input, resize handle, character limit feedback
- **Toggle/Switches**: Binary on/off, clear labeling
- **Dropdowns/Selects**: Show selected value, keyboard navigation (arrow keys)
- **Submit button**: Clear call-to-action, disabled until valid, loading state

#### Feedback Components
- **Badges**: Small labels, status indicators (use color + icon)
- **Toasts**: Non-blocking notifications (top/bottom, auto-dismiss)
- **Tooltips**: Contextual help on hover/focus, keyboard accessible

### Navigation Components
- **Breadcrumbs**: Shows hierarchy, last item not clickable
- **Tabs**: Group related content, indicate active state clearly
- **Navigation bars**: Sticky or fixed, responsive collapse to hamburger menu

### Data Display
- **Tables**: Clear headers, sortable columns, accessible markup (th scope)
- **Lists**: Ordered (ol) or unordered (ul), nested structure for hierarchy
- **Cards**: Self-contained content unit, consistent spacing and shadows
- **Accordions**: Collapsed/expanded sections, one or multiple open

### Visual Elements
- **Icons**: Consistent stroke weight, size, and style (align or center)
- **Labels**: Associated with inputs via `<label for="">`, required/optional indicator
- **Dividers**: Visual separation (color, opacity, or subtle line)
- **Avatars**: Profile pictures or initials, consistent sizing
- **Borders**: Subtle (often unnecessary), use sparingly for separation
- **Shadows**: Add depth, avoid excessive use (flat design trend)

---

## 5. Design Process & Implementation

### Workflow
1. **Wireframe**: Low-fidelity layout, content structure, user flow
2. **Style Guide**: Define design system (colors, typography, spacing, components)
3. **Component Library**: Build reusable, documented components
4. **Design Implementation**: Code components with accessibility, responsiveness
5. **Iteration & Testing**: Gather feedback, refine, test with users

### Building Color Palettes
1. Start with a primary color (brand identity)
2. Generate secondary colors (analogous or complementary)
3. Create neutral palette (grays for text, backgrounds, borders)
4. Test contrast ratios (WCAG AA minimum 4.5:1)
5. Define semantic colors (success green, error red, warning yellow, info blue)
6. Document hex/RGB/HSL values and usage

### Preparing Typography Systems
1. Choose 1–2 typefaces (one serif/display + one sans, or 1 main + 1 accent)
2. Establish a type scale (e.g., Major Third 1.25x ratio)
3. Define sizes for body (16px base), headings, captions, labels
4. Set line heights (1.4–1.6 body, 1–1.3 headings)
5. Set letter spacing (normal for body, tighter for headings, looser for labels)
6. Test readability on screen at intended sizes

### Spacing & Grid Systems
1. Choose a base unit (8px, 4px) — all spacing multiples of this
2. Define scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, etc.
3. Use for: padding, margin, gaps, border-radius
4. Establish column grid (12-col common, 4-col for mobile)
5. Define gutters (gap between columns)
6. Maintain consistency across all layouts

### Imagery & Iconography
- **Imagery**: Consistent style (all photos, illustrations, or mixed intentionally)
- **Icons**: Match stroke weight and proportions, use 24px or 32px base
- **Photography**: Consistent color grading, aspect ratios, subject matter
- **Illustrations**: Consistent line weight, perspective, and palette

### Logo Design
- **Simplicity**: Recognizable at small sizes (favicon, 16px)
- **Color**: Works in monochrome and full color
- **Timeless**: Avoid trendy styles that age quickly
- **Versatility**: Horizontal, square, and vertical lockups
- **Scalability**: Clean at all sizes, no super-thin lines

---

## Quick Checklists

### Accessibility Checklist
- [ ] 4.5:1 contrast ratio on all text
- [ ] All buttons have keyboard focus state
- [ ] Form labels associated with inputs (`<label for="">`)
- [ ] Color not the only way to convey information (use icons, text, pattern)
- [ ] All images have alt text
- [ ] Interactive elements are 44x44px minimum
- [ ] Keyboard navigation works (tab, arrow keys, enter)
- [ ] No content relies on color alone

### Design System Checklist
- [ ] Color palette defined (primary, secondary, neutrals, semantic)
- [ ] Typography scale established (sizes, weights, line heights)
- [ ] Spacing scale defined (base unit multiples)
- [ ] Components documented with states (default, hover, active, disabled, focus)
- [ ] Icons/imagery style consistent
- [ ] Responsive breakpoints documented
- [ ] Accessibility guidelines included
- [ ] Usage examples provided for each component

### Component Review Checklist
- [ ] Consistent with design system
- [ ] All states covered (hover, active, disabled, focus, loading)
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Accessible (contrast, labels, keyboard nav, focus state)
- [ ] Performance (no layout shift, optimized assets)
- [ ] Documented (purpose, usage, variations)

