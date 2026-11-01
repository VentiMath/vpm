import memoize from 'vemotion-memoize';

// Props that React renders as DOM attributes: what styled() forwards to a DOM
// element. The names are React's HTML and SVG attribute props (with Preact's
// class, for and autofocus), as of React 19 and current HTML (invoker
// commands, declarative shadow roots, shadow parts). `as` is not one: it is
// styled's own prop.
const ATTRIBUTES = new Set(
  `
abbr about accentHeight accept acceptCharset accessKey accumulate action
additive alignmentBaseline allow allowFullScreen allowPaymentRequest
allowReorder allowTransparency allowUserMedia alphabetic alt amplitude
arabicForm ascent async attributeName attributeType autoCapitalize
autoComplete autoCorrect autoFocus autofocus autoPlay autoReverse autoSave
azimuth baseFrequency baselineShift baseProfile bbox begin bias blocking by
calcMode capHeight capture cellPadding cellSpacing challenge charSet checked
children cite class classID className clip clipPath clipPathUnits clipRule
closedBy color colorInterpolation colorInterpolationFilters colorProfile
colorRendering cols colSpan command commandFor content contentEditable
contentScriptType contentStyleType contextMenu controls controlsList coords
crossOrigin cursor cx cy d dangerouslySetInnerHTML data datatype dateTime
decelerate decoding default defaultChecked defaultValue defer descent
diffuseConstant dir direction disabled disablePictureInPicture
disableRemotePlayback display divisor dominantBaseline download draggable dur
dx dy edgeMode elementTiming elevation enableBackground encType end
enterKeyHint exponent exportParts externalResourcesRequired fallback
fetchPriority fetchpriority fill fillOpacity fillRule filter filterRes
filterUnits floodColor floodOpacity focusable fontFamily fontSize
fontSizeAdjust fontStretch fontStyle fontVariant fontWeight for form
formAction format formEncType formMethod formNoValidate formTarget fr
frameBorder from fx fy g1 g2 glyphName glyphOrientationHorizontal
glyphOrientationVertical glyphRef gradientTransform gradientUnits hanging
headers height hidden high horizAdvX horizOriginX href hrefLang htmlFor
httpEquiv id ideographic imageRendering imageSizes imageSrcSet in in2
incremental inert inlist innerHTML inputMode integrity intercept is itemID
itemProp itemRef itemScope itemType k k1 k2 k3 k4 kernelMatrix
kernelUnitLength kerning key keyParams keyPoints keySplines keyTimes keyType
kind label lang lengthAdjust letterSpacing lightingColor limitingConeAngle
list loading local loop low marginHeight marginWidth markerEnd markerHeight
markerMid markerStart markerUnits markerWidth mask maskContentUnits maskUnits
mathematical max maxLength media mediaGroup method min minLength mode
multiple muted name noModule nonce noValidate numOctaves offset on opacity
open operator optimum option order orient orientation origin overflow
overlinePosition overlineThickness paintOrder panose1 part pathLength pattern
patternContentUnits patternTransform patternUnits placeholder playsInline
pointerEvents points pointsAtX pointsAtY pointsAtZ popover popoverTarget
popoverTargetAction poster precedence prefix preload preserveAlpha
preserveAspectRatio primitiveUnits profile property r radioGroup radius
readOnly ref referrerPolicy refX refY rel renderingIntent repeatCount
repeatDur required requiredExtensions requiredFeatures resource restart
result results reversed role rotate rows rowSpan rx ry sandbox scale scope
scoped scrolling seamless security seed selected shadowRootClonable
shadowRootDelegatesFocus shadowRootMode shadowRootSerializable shape
shapeRendering size sizes slope slot spacing span specularConstant
specularExponent speed spellCheck spreadMethod src srcDoc srcLang srcSet
start startOffset stdDeviation stemh stemv step stitchTiles stopColor
stopOpacity strikethroughPosition strikethroughThickness string stroke
strokeDasharray strokeDashoffset strokeLinecap strokeLinejoin
strokeMiterlimit strokeOpacity strokeWidth style summary
suppressContentEditableWarning suppressHydrationWarning surfaceScale
systemLanguage tabIndex tableValues target targetX targetY textAnchor
textDecoration textLength textRendering title to transform transformOrigin
translate type typeof u1 u2 underlinePosition underlineThickness unicode
unicodeBidi unicodeRange unitsPerEm unselectable useMap vAlphabetic value
valueLink values vectorEffect version vertAdvY vertOriginX vertOriginY
vHanging vIdeographic viewBox viewTarget visibility vMathematical vocab width
widths wmode wordSpacing wrap writingMode writingSuggestions x x1 x2
xChannelSelector xHeight xlinkActuate xlinkArcrole xlinkHref xlinkRole
xlinkShow xlinkTitle xlinkType xmlBase xmlLang xmlns xmlnsXlink xmlSpace y y1
y2 yChannelSelector z zoomAndPan
`
    .trim()
    .split(/\s+/),
);

/** data-*, aria-* (any case) and x-* attributes. */
const PREFIXED = /^([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-/;

/**
 * Whether a prop is a DOM attribute or an event handler (on followed by an
 * upper-case letter).
 * @param {string} prop
 * @returns {boolean}
 */
const isPropValid = memoize(
  prop => ATTRIBUTES.has(prop) || PREFIXED.test(prop) || (prop.charCodeAt(0) === 111 && prop.charCodeAt(1) === 110 && prop.charCodeAt(2) < 91),
);

export default isPropValid;
