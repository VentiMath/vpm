import type * as React from "react";
import type { SxProps, Theme } from "vmui-system";
export interface ButtonBaseActions {
  focusVisible(): void;
}
export interface RippleActions {
  start(
    event?: unknown,
    options?: { center?: boolean },
    callback?: () => void,
  ): void;
  stop(event?: unknown, callback?: () => void): void;
  pulsate(): void;
}
export interface ButtonBaseOwnProps {
  action?: React.Ref<ButtonBaseActions>;
  children?: React.ReactNode;
  className?: string;
  classes?: Partial<Record<string, string>>;
  disabled?: boolean;
  /** Whether a custom root renders a native button; false opts into ARIA button semantics. */
  nativeButton?: boolean;
  disableRipple?: boolean;
  disableTouchRipple?: boolean;
  focusRipple?: boolean;
  centerRipple?: boolean;
  focusVisibleClassName?: string;
  onFocusVisible?: React.FocusEventHandler<HTMLElement>;
  LinkComponent?: React.ElementType;
  touchRippleRef?: React.Ref<RippleActions>;
  sx?: SxProps<Theme>;
}
export type ButtonBaseProps<C extends React.ElementType = "button"> =
  ButtonBaseOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ButtonBaseOwnProps> & {
      component?: C;
    };
export type ButtonColor =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "info"
  | "warning"
  | "inherit"
  | (string & {});
export interface ButtonOwnProps extends ButtonBaseOwnProps {
  color?: ButtonColor;
  variant?: "text" | "outlined" | "contained" | (string & {});
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  disableElevation?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean | null;
  loadingIndicator?: React.ReactNode;
  loadingPosition?: "start" | "center" | "end";
}
export type ButtonProps<C extends React.ElementType = "button"> =
  ButtonOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ButtonOwnProps> & {
      component?: C;
    };
export interface IconButtonOwnProps extends ButtonBaseOwnProps {
  color?: ButtonColor | "default";
  size?: "small" | "medium" | "large";
  edge?: "start" | "end" | false;
  disableFocusRipple?: boolean;
  loading?: boolean | null;
  loadingIndicator?: React.ReactNode;
}
export type IconButtonProps<C extends React.ElementType = "button"> =
  IconButtonOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof IconButtonOwnProps> & {
      component?: C;
    };
export interface FabOwnProps extends ButtonBaseOwnProps {
  color?: ButtonColor | "default";
  size?: "small" | "medium" | "large";
  variant?: "circular" | "extended";
  disableFocusRipple?: boolean;
}
export type FabProps<C extends React.ElementType = "button"> = FabOwnProps &
  Omit<React.ComponentPropsWithRef<C>, keyof FabOwnProps> & { component?: C };
export interface ButtonGroupOwnProps extends Omit<
  ButtonOwnProps,
  | "action"
  | "startIcon"
  | "endIcon"
  | "loading"
  | "loadingIndicator"
  | "loadingPosition"
> {
  orientation?: "horizontal" | "vertical";
}
export type ButtonGroupProps<C extends React.ElementType = "div"> =
  ButtonGroupOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ButtonGroupOwnProps> & {
      component?: C;
    };
export interface ToggleButtonOwnProps extends ButtonBaseOwnProps {
  value: unknown;
  selected?: boolean;
  color?: ButtonColor | "standard";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  onChange?: (event: React.MouseEvent<HTMLElement>, value: any) => void;
}
export type ToggleButtonProps<C extends React.ElementType = "button"> =
  ToggleButtonOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ToggleButtonOwnProps> & {
      component?: C;
    };
export interface ToggleButtonGroupOwnProps extends Omit<
  ButtonBaseOwnProps,
  | "action"
  | "focusRipple"
  | "centerRipple"
  | "touchRippleRef"
  | "disableTouchRipple"
  | "focusVisibleClassName"
  | "onFocusVisible"
  | "LinkComponent"
> {
  value?: any;
  onChange?: (event: React.MouseEvent<HTMLElement>, value: any) => void;
  exclusive?: boolean;
  color?: ButtonColor | "standard";
  size?: "small" | "medium" | "large";
  orientation?: "horizontal" | "vertical";
  fullWidth?: boolean;
}
export type ToggleButtonGroupProps<C extends React.ElementType = "div"> =
  ToggleButtonGroupOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ToggleButtonGroupOwnProps> & {
      component?: C;
    };
export interface Control<P, D extends React.ElementType> {
  <C extends React.ElementType>(
    props: P & { component: C } & Omit<
        React.ComponentPropsWithRef<C>,
        keyof P | "component"
      >,
  ): React.JSX.Element | null;
  (
    props: P & { href: string } & Omit<
        React.ComponentPropsWithRef<"a">,
        keyof P | "component"
      >,
  ): React.JSX.Element | null;
  (
    props: P & { component?: D } & Omit<
        React.ComponentPropsWithRef<D>,
        keyof P | "component"
      >,
  ): React.JSX.Element | null;
}
export const ButtonBase: Control<ButtonBaseOwnProps, "button">;
export const Button: Control<ButtonOwnProps, "button">;
export const IconButton: Control<IconButtonOwnProps, "button">;
export const Fab: Control<FabOwnProps, "button">;
export const ButtonGroup: Control<ButtonGroupOwnProps, "div">;
export const ToggleButton: Control<ToggleButtonOwnProps, "button">;
export const ToggleButtonGroup: Control<ToggleButtonGroupOwnProps, "div">;
export const buttonBaseClasses: Readonly<Record<string, string>>;
export function getButtonBaseUtilityClass(slot: string): string;
export const buttonClasses: Readonly<Record<string, string>>;
export function getButtonUtilityClass(slot: string): string;
export const iconButtonClasses: Readonly<Record<string, string>>;
export function getIconButtonUtilityClass(slot: string): string;
export const fabClasses: Readonly<Record<string, string>>;
export function getFabUtilityClass(slot: string): string;
export const buttonGroupClasses: Readonly<Record<string, string>>;
export function getButtonGroupUtilityClass(slot: string): string;
export const toggleButtonClasses: Readonly<Record<string, string>>;
export function getToggleButtonUtilityClass(slot: string): string;
export const toggleButtonGroupClasses: Readonly<Record<string, string>>;
export function getToggleButtonGroupUtilityClass(slot: string): string;

export interface TypographyOwnProps extends Omit<import("vmui-system").SystemProps<Theme>, "color"> {
  align?: "inherit" | "left" | "center" | "right" | "justify";
  children?: React.ReactNode;
  classes?: Partial<TypographyClasses>;
  className?: string;
  color?: string;
  gutterBottom?: boolean;
  noWrap?: boolean;
  /** Retained for VentiMath's Material 7 callers. */
  paragraph?: boolean;
  sx?: SxProps<Theme>;
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "subtitle1" | "subtitle2" | "body1" | "body2" | "button" | "caption" | "overline" | "inherit" | (string & {});
  variantMapping?: Partial<Record<string, React.ElementType>>;
}
export interface LinkOwnProps extends Omit<TypographyOwnProps, "classes"> {
  classes?: Partial<LinkClasses>;
  TypographyClasses?: Partial<TypographyClasses>;
  underline?: "none" | "hover" | "always";
}
export interface SvgIconOwnProps {
  children?: React.ReactNode;
  classes?: Partial<SvgIconClasses>;
  className?: string;
  color?: "inherit" | "action" | "disabled" | ButtonColor;
  fontSize?: "inherit" | "small" | "medium" | "large" | (string & {});
  htmlColor?: string;
  inheritViewBox?: boolean;
  shapeRendering?: string;
  sx?: SxProps<Theme>;
  titleAccess?: string;
  viewBox?: string;
}
export type TypographyProps<C extends React.ElementType = "span"> = TypographyOwnProps & Omit<React.ComponentPropsWithRef<C>, keyof TypographyOwnProps> & {component?: C};
export type LinkProps<C extends React.ElementType = "a"> = LinkOwnProps & Omit<React.ComponentPropsWithRef<C>, keyof LinkOwnProps> & {component?: C};
export type SvgIconProps<C extends React.ElementType = "svg"> = SvgIconOwnProps & Omit<React.ComponentPropsWithRef<C>, keyof SvgIconOwnProps> & {component?: C};
export interface TextComponent<P, D extends React.ElementType> {
  <C extends React.ElementType>(props:P & {component:C} & Omit<React.ComponentPropsWithRef<C>,keyof P | "component">):React.JSX.Element | null;
  (props:P & {component?:D} & Omit<React.ComponentPropsWithRef<D>,keyof P | "component">):React.JSX.Element | null;
}
export const Typography:TextComponent<TypographyOwnProps,"span">;
export const Link:TextComponent<LinkOwnProps,"a">;
export const SvgIcon:TextComponent<SvgIconOwnProps,"svg"> & {muiName:string};
export function createSvgIcon(path:React.ReactNode,displayName:string):typeof SvgIcon;
export interface TypographyClasses extends Record<"root" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "subtitle1" | "subtitle2" | "body1" | "body2" | "inherit" | "button" | "caption" | "overline" | "alignLeft" | "alignRight" | "alignCenter" | "alignJustify" | "noWrap" | "gutterBottom" | "paragraph", string> {}
export interface LinkClasses extends Record<"root" | "underlineNone" | "underlineHover" | "underlineAlways" | "button" | "focusVisible", string> {}
export interface SvgIconClasses extends Record<"root" | "colorPrimary" | "colorSecondary" | "colorAction" | "colorError" | "colorDisabled" | "fontSizeInherit" | "fontSizeSmall" | "fontSizeMedium" | "fontSizeLarge", string> {}
export const typographyClasses:Readonly<TypographyClasses>;
export const linkClasses:Readonly<LinkClasses>;
export const svgIconClasses:Readonly<SvgIconClasses>;
export function getTypographyUtilityClass(slot:string):string;
export function getLinkUtilityClass(slot:string):string;
export function getSvgIconUtilityClass(slot:string):string;

export type {Theme,SxProps,BoxProps,GlobalStylesProps} from "vmui-system";
export const Box: typeof import("vmui-system").Box;
export const boxClasses: {readonly root:string};
export const styled: typeof import("vmui-system").styled;
export function useTheme<T = Theme>(): T;
export function ThemeProvider<T extends object>(props: Omit<import("vmui-system").ThemeProviderProps<T>, "themeId"> & {defaultMode?:"light"|"dark"|"system"; storageManager?:null; disableStyleSheetGeneration?:boolean; disableNestedContext?:boolean}):React.JSX.Element;
export const GlobalStyles: typeof import("vmui-system").GlobalStyles;
export const useThemeProps: typeof import("vmui-system").useThemeProps;
export const useMediaQuery: typeof import("vmui-system").useMediaQuery;
export function useColorScheme(): {mode?:string;systemMode?:string;colorScheme?:string;allColorSchemes:string[];setMode(mode:"light"|"dark"|"system"|null):void;setColorScheme(scheme:string|Record<string,string>):void};
export const THEME_ID: "$$material";

export interface PaperOwnProps { children?:React.ReactNode; className?:string; classes?:Partial<PaperClasses>; elevation?:number; square?:boolean; variant?:'elevation'|'outlined'|(string & {}); sx?:SxProps<Theme>; }
export interface DividerOwnProps { children?:React.ReactNode; className?:string; classes?:Partial<DividerClasses>; absolute?:boolean; flexItem?:boolean; /** Legacy app Material 7 option. */ light?:boolean; orientation?:'horizontal'|'vertical'; textAlign?:'left'|'center'|'right'; variant?:'fullWidth'|'inset'|'middle'|(string & {}); sx?:SxProps<Theme>; }
export interface IconOwnProps {children?:React.ReactNode; className?:string; classes?:Partial<IconClasses>; baseClassName?:string; color?:'inherit'|'action'|'disabled'|ButtonColor; fontSize?:'inherit'|'small'|'medium'|'large'|(string & {}); sx?:SxProps<Theme>;}
export type PaperClasses=Record<'root'|'rounded'|'outlined'|'elevation'|`elevation${number}`,string>;
export type DividerClasses=Record<'root'|'absolute'|'fullWidth'|'inset'|'middle'|'flexItem'|'light'|'vertical'|'withChildren'|'withChildrenVertical'|'textAlignLeft'|'textAlignRight'|'wrapper'|'wrapperVertical',string>;
export type IconClasses=Record<'root'|'colorPrimary'|'colorSecondary'|'colorAction'|'colorError'|'colorDisabled'|'fontSizeInherit'|'fontSizeSmall'|'fontSizeMedium'|'fontSizeLarge',string>;
export type PaperProps<C extends React.ElementType="div">=PaperOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof PaperOwnProps> & {component?:C};
export const Paper:TextComponent<PaperOwnProps,"div">;
export const paperClasses:Readonly<PaperClasses>;
export function getPaperUtilityClass(slot:string):string;
export type DividerProps<C extends React.ElementType="hr">=DividerOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof DividerOwnProps> & {component?:C};
export const Divider:TextComponent<DividerOwnProps,"hr">;
export const dividerClasses:Readonly<DividerClasses>;
export function getDividerUtilityClass(slot:string):string;
export type IconProps<C extends React.ElementType="span">=IconOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof IconOwnProps> & {component?:C};
export const Icon:TextComponent<IconOwnProps,"span"> & {muiName:string};
export const iconClasses:Readonly<IconClasses>;
export function getIconUtilityClass(slot:string):string;

export interface FormControlOwnProps {children?:React.ReactNode; className?:string; classes?:Partial<FormControlClasses>; color?:ButtonColor; disabled?:boolean; error?:boolean; focused?:boolean; fullWidth?:boolean; hiddenLabel?:boolean; margin?:'none'|'dense'|'normal'; required?:boolean; size?:'small'|'medium'|(string & {}); variant?:'standard'|'filled'|'outlined'; sx?:SxProps<Theme>;}
export interface FormLabelOwnProps {children?:React.ReactNode; className?:string; classes?:Partial<FormLabelClasses>; color?:ButtonColor; disabled?:boolean; error?:boolean; filled?:boolean; focused?:boolean; required?:boolean; sx?:SxProps<Theme>;}
export interface FormHelperTextOwnProps {children?:React.ReactNode; className?:string; classes?:Partial<FormHelperTextClasses>; disabled?:boolean; error?:boolean; filled?:boolean; focused?:boolean; required?:boolean; margin?:'dense'; variant?:'standard'|'filled'|'outlined'|(string & {}); sx?:SxProps<Theme>;}
export type FormControlClasses=Record<'root'|'marginNone'|'marginNormal'|'marginDense'|'fullWidth'|'disabled',string>;
export type FormLabelClasses=Record<'root'|'colorSecondary'|'focused'|'disabled'|'error'|'filled'|'required'|'asterisk',string>;
export type FormHelperTextClasses=Record<'root'|'error'|'disabled'|'sizeSmall'|'sizeMedium'|'contained'|'focused'|'filled'|'required',string>;
export interface FormControlState {adornedStart:boolean; color:ButtonColor; disabled:boolean; error:boolean; filled:boolean; focused:boolean; fullWidth:boolean; hiddenLabel:boolean; required:boolean; size:NonNullable<FormControlOwnProps['size']>; variant:NonNullable<FormControlOwnProps['variant']>; onFocus:React.FocusEventHandler; onBlur:React.FocusEventHandler; onFilled():void; onEmpty():void; registerEffect():()=>void; setAdornedStart:React.Dispatch<React.SetStateAction<boolean>>;}
export function useFormControl():FormControlState|undefined;
export type FormControlProps<C extends React.ElementType="div">=FormControlOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof FormControlOwnProps> & {component?:C};
export const FormControl:TextComponent<FormControlOwnProps,"div">;
export const formControlClasses:Readonly<FormControlClasses>;
export function getFormControlUtilityClass(slot:string):string;
export type FormLabelProps<C extends React.ElementType="label">=FormLabelOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof FormLabelOwnProps> & {component?:C};
export const FormLabel:TextComponent<FormLabelOwnProps,"label">;
export const formLabelClasses:Readonly<FormLabelClasses>;
export function getFormLabelUtilityClass(slot:string):string;
export type FormHelperTextProps<C extends React.ElementType="p">=FormHelperTextOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof FormHelperTextOwnProps> & {component?:C};
export const FormHelperText:TextComponent<FormHelperTextOwnProps,"p">;
export const formHelperTextClasses:Readonly<FormHelperTextClasses>;
export function getFormHelperTextUtilityClass(slot:string):string;

export interface InputBaseComponentProps extends React.HTMLAttributes<HTMLInputElement|HTMLTextAreaElement> { [key:string]:any; }
export type InputBaseClasses=Record<'root'|'formControl'|'focused'|'disabled'|'adornedStart'|'adornedEnd'|'error'|'sizeSmall'|'multiline'|'colorSecondary'|'fullWidth'|'hiddenLabel'|'readOnly'|'input'|'inputTypeSearch',string>;
export interface InputBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>,'children'|'defaultValue'|'onChange'|'onFocus'|'onBlur'|'onKeyDown'|'onKeyUp'|'onInvalid'> {
 classes?:Partial<InputBaseClasses>; color?:ButtonColor; disabled?:boolean; error?:boolean; fullWidth?:boolean; required?:boolean; readOnly?:boolean; multiline?:boolean; disableInjectingGlobalStyles?:boolean; size?:'small'|'medium'|(string & {}); margin?:'none'|'dense';
 autoComplete?:string; autoFocus?:boolean; defaultValue?:unknown; value?:unknown; name?:string; placeholder?:string; type?:string; rows?:number|string; minRows?:number|string; maxRows?:number|string;
 startAdornment?:React.ReactNode; endAdornment?:React.ReactNode; inputComponent?:React.ElementType<InputBaseComponentProps>; inputProps?:InputBaseComponentProps; inputRef?:React.Ref<any>; sx?:SxProps<Theme>;
 slots?:{root?:React.ElementType;input?:React.ElementType}; slotProps?:{root?:React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;sx?:SxProps<Theme>};input?:InputBaseComponentProps&{sx?:SxProps<Theme>}};
 /** Retained for app Material 7 callers. */ components?:{Root?:React.ElementType;Input?:React.ElementType}; componentsProps?:InputBaseProps['slotProps'];
 onChange?:React.ChangeEventHandler<HTMLInputElement|HTMLTextAreaElement>; onFocus?:React.FocusEventHandler<HTMLInputElement|HTMLTextAreaElement>; onBlur?:React.FocusEventHandler<HTMLInputElement|HTMLTextAreaElement>; onKeyDown?:React.KeyboardEventHandler<HTMLInputElement|HTMLTextAreaElement>; onKeyUp?:React.KeyboardEventHandler<HTMLInputElement|HTMLTextAreaElement>; onInvalid?:React.FormEventHandler<HTMLInputElement|HTMLTextAreaElement>;
 renderSuffix?:(state:{disabled?:boolean;error?:boolean;filled?:boolean;focused?:boolean;required?:boolean;margin?:'none'|'dense'|'normal';startAdornment?:React.ReactNode})=>React.ReactNode;
}
export const InputBase:React.ForwardRefExoticComponent<InputBaseProps & React.RefAttributes<HTMLDivElement>>;
export const inputBaseClasses:Readonly<InputBaseClasses>;
export function getInputBaseUtilityClass(slot:string):string;

export type InputClasses=Record<'root'|'colorSecondary'|'focused'|'disabled'|'adornedStart'|'adornedEnd'|'error'|'sizeSmall'|'multiline'|'input'|'inputTypeSearch'|'underline',string>;
export type OutlinedInputClasses=Record<Exclude<keyof InputClasses,'underline'>|'notchedOutline',string>;
export interface InputProps extends Omit<InputBaseProps,'classes'> {classes?:Partial<InputClasses>; disableUnderline?:boolean; notched?:boolean;}
export interface OutlinedInputProps extends Omit<InputBaseProps,'classes'|'slots'|'slotProps'> {
 classes?:Partial<OutlinedInputClasses>; label?:React.ReactNode; notched?:boolean;
 slots?:NonNullable<InputBaseProps['slots']>&{notchedOutline?:React.ElementType};
 slotProps?:NonNullable<InputBaseProps['slotProps']>&{notchedOutline?:OutlinedInputOutlineProps|((ownerState:OutlinedInputOwnerState)=>OutlinedInputOutlineProps)};
}
export interface OutlinedInputOwnerState extends Omit<OutlinedInputProps,'slots'|'slotProps'> {}
export type OutlinedInputOutlineProps=React.FieldsetHTMLAttributes<HTMLFieldSetElement>&{ref?:React.Ref<HTMLFieldSetElement>;sx?:SxProps<Theme>};
export const Input:React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLDivElement>> & {muiName:string};
export const OutlinedInput:React.ForwardRefExoticComponent<OutlinedInputProps & React.RefAttributes<HTMLDivElement>> & {muiName:string};
export const inputClasses:Readonly<InputClasses>;
export const outlinedInputClasses:Readonly<OutlinedInputClasses>;
export function getInputUtilityClass(slot:string):string;
export function getOutlinedInputUtilityClass(slot:string):string;

export type InputLabelClasses=Record<'root'|'focused'|'disabled'|'error'|'required'|'asterisk'|'formControl'|'sizeSmall'|'shrink'|'animated'|'standard'|'filled'|'outlined',string>;
export interface InputLabelOwnProps extends Omit<FormLabelOwnProps,'classes'> {classes?:Partial<InputLabelClasses>; disableAnimation?:boolean; shrink?:boolean; margin?:'dense'; size?:'small'|'medium'|(string & {}); variant?:'standard'|'outlined'|'filled';}
export type InputLabelProps<C extends React.ElementType='label'>=InputLabelOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof InputLabelOwnProps> & {component?:C};
export const InputLabel:TextComponent<InputLabelOwnProps,'label'>;
export const inputLabelClasses:Readonly<InputLabelClasses>;
export function getInputLabelUtilityClass(slot:string):string;
export type InputAdornmentClasses=Record<'root'|'filled'|'standard'|'outlined'|'positionStart'|'positionEnd'|'disablePointerEvents'|'hiddenLabel'|'sizeSmall',string>;
export interface InputAdornmentOwnProps {children?:React.ReactNode; className?:string; classes?:Partial<InputAdornmentClasses>; disablePointerEvents?:boolean; disableTypography?:boolean; position:'start'|'end'; variant?:'standard'|'outlined'|'filled'; sx?:SxProps<Theme>;}
export type InputAdornmentProps<C extends React.ElementType='div'>=InputAdornmentOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof InputAdornmentOwnProps> & {component?:C};
export const InputAdornment:TextComponent<InputAdornmentOwnProps,'div'>;
export const inputAdornmentClasses:Readonly<InputAdornmentClasses>;
export function getInputAdornmentUtilityClass(slot:string):string;

export type TextFieldVariants='outlined'|'standard'|'filled';
export interface TextFieldOwnerState extends Omit<FormControlOwnProps,'classes'> {autoFocus:boolean; color:ButtonColor; disabled:boolean; error:boolean; fullWidth:boolean; multiline:boolean; required:boolean; select:boolean; variant:TextFieldVariants; label?:React.ReactNode; helperText?:React.ReactNode; value?:unknown;}
export type TextFieldSlotProps<P>=P|((ownerState:TextFieldOwnerState)=>P);
export interface TextFieldSelectSlotProps {native?:boolean; multiple?:boolean; displayEmpty?:boolean; renderValue?:(value:any)=>React.ReactNode; onChange?:(event:any,child?:React.ReactNode)=>void; [key:string]:any;}
export interface TextFieldSlots {root?:React.ElementType;input?:React.ElementType;inputLabel?:React.ElementType;htmlInput?:React.ElementType;formHelperText?:React.ElementType;select?:React.ElementType;}
export interface TextFieldProps<V extends TextFieldVariants=TextFieldVariants> extends Omit<FormControlProps,'children'|'onChange'|'onFocus'|'onBlur'|'defaultValue'|'classes'|'variant'> {
 autoComplete?:string; autoFocus?:boolean; children?:React.ReactNode; classes?:Partial<TextFieldClasses>; defaultValue?:unknown; helperText?:React.ReactNode; id?:string; inputRef?:React.Ref<any>; label?:React.ReactNode; maxRows?:number|string; minRows?:number|string; multiline?:boolean; name?:string; placeholder?:string; rows?:number|string; select?:boolean; type?:React.HTMLInputTypeAttribute; value?:unknown; variant?:V;
 onChange?:React.ChangeEventHandler<HTMLInputElement|HTMLTextAreaElement>; onBlur?:React.FocusEventHandler<HTMLInputElement|HTMLTextAreaElement>; onFocus?:React.FocusEventHandler<HTMLInputElement|HTMLTextAreaElement>;
 slots?:TextFieldSlots;
 slotProps?:{root?:TextFieldSlotProps<FormControlProps>;input?:TextFieldSlotProps<Partial<V extends 'standard'?InputProps:OutlinedInputProps>>;inputLabel?:TextFieldSlotProps<InputLabelProps>;htmlInput?:TextFieldSlotProps<InputBaseComponentProps>;formHelperText?:TextFieldSlotProps<FormHelperTextProps>;select?:TextFieldSlotProps<TextFieldSelectSlotProps>};
 /** Legacy app Material 7 aliases; slotProps take precedence. */
 InputProps?:Partial<V extends 'standard'?InputProps:OutlinedInputProps>; InputLabelProps?:InputLabelProps; inputProps?:InputBaseComponentProps; FormHelperTextProps?:FormHelperTextProps; SelectProps?:TextFieldSelectSlotProps;
}
export type TextFieldClasses=Record<'root',string>;
export function TextField<V extends TextFieldVariants=TextFieldVariants>(props:TextFieldProps<V>):React.ReactElement|null;
export const textFieldClasses:Readonly<TextFieldClasses>;
export function getTextFieldUtilityClass(slot:string):string;
