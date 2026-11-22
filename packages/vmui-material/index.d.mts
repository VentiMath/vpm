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

export type {Theme,SxProps,BoxProps} from "vmui-system";
export const Box: typeof import("vmui-system").Box;
export const boxClasses: {readonly root:string};
export const styled: typeof import("vmui-system").styled;
export function useTheme<T = Theme>(): T;
export function ThemeProvider<T extends object>(props: Omit<import("vmui-system").ThemeProviderProps<T>, "themeId"> & {defaultMode?:"light"|"dark"|"system"; storageManager?:null; disableStyleSheetGeneration?:boolean; disableNestedContext?:boolean}):React.JSX.Element;
export type GlobalStylesProps<T extends object = Theme> = Pick<import("vmui-system").GlobalStylesProps<T>, "styles">;
export function GlobalStyles<T extends object = Theme>(props: GlobalStylesProps<T>): React.ReactElement;
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

export interface ListOwnProps { children?: React.ReactNode; dense?: boolean; disablePadding?: boolean; subheader?: React.ReactNode; classes?: Partial<Record<'root'|'padding'|'dense'|'subheader',string>>; sx?: SxProps<Theme>; }
export type ListProps<C extends React.ElementType='ul'>=ListOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof ListOwnProps> & {component?:C};
export declare const List:<C extends React.ElementType='ul'>(props:ListProps<C>)=>React.ReactElement|null;
export interface MenuItemOwnProps extends ButtonBaseOwnProps {autoFocus?:boolean;dense?:boolean;disableGutters?:boolean;divider?:boolean;selected?:boolean;value?:unknown;}
export type MenuItemProps<C extends React.ElementType='li'>=MenuItemOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof MenuItemOwnProps> & {component?:C};
export declare const MenuItem:<C extends React.ElementType='li'>(props:MenuItemProps<C>)=>React.ReactElement|null;
export type MenuListProps<C extends React.ElementType='ul'>=ListProps<C>&{autoFocus?:boolean;autoFocusItem?:boolean;disabledItemsFocusable?:boolean;disableListWrap?:boolean;variant?:'menu'|'selectedMenu'};
export declare const MenuList:<C extends React.ElementType='ul'>(props:MenuListProps<C>)=>React.ReactElement|null;
export type ListItemIconProps=React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;classes?:Partial<Record<'root'|'alignItemsFlexStart',string>>;sx?:SxProps<Theme>};
export declare const ListItemIcon:React.ForwardRefExoticComponent<ListItemIconProps>;
export type ListItemTextProps=React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;primary?:React.ReactNode;secondary?:React.ReactNode;inset?:boolean;disableTypography?:boolean;classes?:Partial<Record<'root'|'primary'|'secondary'|'inset'|'dense'|'multiline',string>>;sx?:SxProps<Theme>;slots?:{root?:React.ElementType;primary?:React.ElementType;secondary?:React.ElementType};slotProps?:{root?:Record<string,unknown>|((state:ListItemTextProps)=>Record<string,unknown>);primary?:TypographyProps|((state:ListItemTextProps)=>TypographyProps);secondary?:TypographyProps|((state:ListItemTextProps)=>TypographyProps)};primaryTypographyProps?:TypographyProps;secondaryTypographyProps?:TypographyProps};
export declare const ListItemText:React.ForwardRefExoticComponent<ListItemTextProps>;
export type ListSubheaderProps<C extends React.ElementType='li'>=Omit<React.ComponentPropsWithRef<C>,'color'>&{component?:C;color?:'default'|'primary'|'inherit';disableGutters?:boolean;disableSticky?:boolean;inset?:boolean;classes?:Partial<Record<'root'|'colorPrimary'|'colorInherit'|'gutters'|'inset'|'sticky',string>>;sx?:SxProps<Theme>};
export declare const ListSubheader:(<C extends React.ElementType='li'>(props:ListSubheaderProps<C>)=>React.ReactElement|null)&{muiSkipListHighlight:true};
export interface PopoverOrigin {vertical:'top'|'center'|'bottom'|number;horizontal:'left'|'center'|'right'|number;}
export interface PopoverActions {updatePosition():void;}
export type PopupSlotProps=Record<string,unknown>|((state:PopoverProps)=>Record<string,unknown>);
export interface PopoverProps extends React.HTMLAttributes<HTMLDivElement> {
 ref?:React.Ref<HTMLDivElement>;open:boolean;anchorEl?:Element|{nodeType:number;getBoundingClientRect():DOMRect}|null|(()=>Element|{nodeType:number;getBoundingClientRect():DOMRect}|null);anchorOrigin?:PopoverOrigin;transformOrigin?:PopoverOrigin;anchorReference?:'anchorEl'|'anchorPosition'|'none';anchorPosition?:{left:number;top:number};marginThreshold?:number|null;container?:Element|(()=>Element|null)|null;
 action?:React.Ref<PopoverActions>;disablePortal?:boolean;keepMounted?:boolean;disableAutoFocus?:boolean;disableEnforceFocus?:boolean;disableRestoreFocus?:boolean;disableEscapeKeyDown?:boolean;disableScrollLock?:boolean;hideBackdrop?:boolean;elevation?:number;sx?:SxProps<Theme>;
 onClose?:(event:{},reason:'escapeKeyDown'|'backdropClick'|'tabKeyDown')=>void;
 transitionDuration?:number|'auto'|{enter?:number;exit?:number};
 slots?:{root?:React.ElementType;paper?:React.ElementType;backdrop?:React.ElementType};slotProps?:{root?:PopupSlotProps;paper?:PopupSlotProps;backdrop?:PopupSlotProps;transition?:PopupSlotProps};
 PaperProps?:PaperProps;BackdropProps?:React.HTMLAttributes<HTMLDivElement>;TransitionProps?:Record<string,unknown>;classes?:Partial<Record<'root'|'paper',string>>;
}
export declare const Popover:React.ForwardRefExoticComponent<PopoverProps>;
export interface MenuProps extends Omit<PopoverProps,'slots'|'slotProps'|'classes'> {autoFocus?:boolean;disableAutoFocusItem?:boolean;variant?:'menu'|'selectedMenu';classes?:Partial<Record<'root'|'paper'|'list',string>>;PopoverClasses?:PopoverProps['classes'];MenuListProps?:MenuListProps;slots?:PopoverProps['slots']&{list?:React.ElementType};slotProps?:PopoverProps['slotProps']&{list?:Record<string,unknown>|((state:MenuProps)=>Record<string,unknown>)};}
export declare const Menu:React.ForwardRefExoticComponent<MenuProps>;
export declare const MenuPaper:React.ComponentType<PaperProps>;
export declare const listClasses: Readonly<Record<string,string>>;
export declare function getListUtilityClass(slot:string):string;
export declare const menuItemClasses: Readonly<Record<string,string>>;
export declare function getMenuItemUtilityClass(slot:string):string;
export declare const listItemIconClasses: Readonly<Record<string,string>>;
export declare function getListItemIconUtilityClass(slot:string):string;
export declare const listItemTextClasses: Readonly<Record<string,string>>;
export declare function getListItemTextUtilityClass(slot:string):string;
export declare const listSubheaderClasses: Readonly<Record<string,string>>;
export declare function getListSubheaderUtilityClass(slot:string):string;
export declare const popoverClasses: Readonly<Record<string,string>>;
export declare function getPopoverUtilityClass(slot:string):string;
export declare const menuClasses: Readonly<Record<string,string>>;
export declare function getMenuUtilityClass(slot:string):string;

export type SelectChangeEvent<Value=string>=(Event & {target:{value:Value;name:string}})|React.ChangeEvent<HTMLInputElement>;
export interface SelectInputHandle<Value=unknown> {focus():void;readonly node:HTMLInputElement|null;readonly value:Value;}
export type SelectClasses=Record<'root'|'select'|'multiple'|'filled'|'outlined'|'standard'|'disabled'|'focused'|'icon'|'iconOpen'|'iconFilled'|'iconOutlined'|'iconStandard'|'nativeInput'|'error',string>;
export interface SelectProps<Value=unknown> extends Omit<InputBaseProps,'classes'|'value'|'defaultValue'|'onChange'|'children'> {
 autoWidth?:boolean;children?:React.ReactNode;classes?:Partial<SelectClasses>;defaultOpen?:boolean;defaultValue?:Value;displayEmpty?:boolean;IconComponent?:React.ElementType;input?:React.ReactElement;label?:React.ReactNode;labelId?:string;MenuProps?:Partial<MenuProps>;multiple?:boolean;native?:boolean;onChange?:(event:SelectChangeEvent<Value>,child:React.ReactNode)=>void;onClose?:(event:React.SyntheticEvent)=>void;onOpen?:(event:React.SyntheticEvent)=>void;open?:boolean;renderValue?:(value:Value)=>React.ReactNode;SelectDisplayProps?:React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>};value?:Value|'';variant?:'outlined'|'standard'|'filled';ref?:React.Ref<HTMLDivElement>;
}
export function Select<Value=unknown>(props:SelectProps<Value>):React.ReactElement|null;
export const selectClasses:Readonly<SelectClasses>;
export function getSelectUtilityClass(slot:string):string;

export type CheckboxClasses=Record<'root'|'checked'|'disabled'|'indeterminate'|'colorPrimary'|'colorSecondary'|'sizeSmall'|'sizeMedium',string>;
export type CheckboxInputSlotProps=React.InputHTMLAttributes<HTMLInputElement>&{ref?:React.Ref<HTMLInputElement>;sx?:SxProps<Theme>};
export interface CheckboxProps extends Omit<ButtonBaseProps<'span'>,'children'|'onChange'|'classes'|'nativeButton'|'component'> {
 checked?:boolean;defaultChecked?:boolean;checkedIcon?:React.ReactNode;icon?:React.ReactNode;indeterminateIcon?:React.ReactNode;indeterminate?:boolean;color?:ButtonColor|'default';size?:'small'|'medium'|'large'|(string&{});edge?:'start'|'end'|false;disableFocusRipple?:boolean;required?:boolean;readOnly?:boolean;name?:string;value?:unknown;autoFocus?:boolean;component?:React.ElementType;inputRef?:React.Ref<HTMLInputElement>;inputProps?:CheckboxInputSlotProps;classes?:Partial<CheckboxClasses>;
 onChange?:(event:React.ChangeEvent<HTMLInputElement>,checked:boolean)=>void;
 slots?:{root?:React.ElementType;input?:React.ElementType};slotProps?:{root?:Partial<ButtonBaseProps<'span'>>|((state:CheckboxProps)=>Partial<ButtonBaseProps<'span'>>);input?:CheckboxInputSlotProps|((state:CheckboxProps)=>CheckboxInputSlotProps)};
}
export const Checkbox:React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLSpanElement>>;
export const checkboxClasses:Readonly<CheckboxClasses>;
export function getCheckboxUtilityClass(slot:string):string;
export type FormControlLabelClasses=Record<'root'|'labelPlacementEnd'|'labelPlacementStart'|'labelPlacementTop'|'labelPlacementBottom'|'disabled'|'label'|'error'|'required'|'asterisk',string>;
export interface FormControlLabelProps extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>,'children'|'onChange'> {
 control:React.ReactElement;label:React.ReactNode;checked?:boolean;disabled?:boolean;required?:boolean;disableTypography?:boolean;labelPlacement?:'end'|'start'|'top'|'bottom';name?:string;value?:unknown;inputRef?:React.Ref<HTMLInputElement>;classes?:Partial<FormControlLabelClasses>;sx?:SxProps<Theme>;
 onChange?:(event:React.SyntheticEvent,checked:boolean)=>void;
 slots?:{typography?:React.ElementType};slotProps?:{typography?:TypographyProps|((state:FormControlLabelProps)=>TypographyProps)};componentsProps?:{typography?:TypographyProps};
}
export const FormControlLabel:React.ForwardRefExoticComponent<FormControlLabelProps & React.RefAttributes<HTMLLabelElement>>;
export const formControlLabelClasses:Readonly<FormControlLabelClasses>;
export function getFormControlLabelUtilityClass(slot:string):string;

export type RadioClasses=Record<'root'|'checked'|'disabled'|'colorPrimary'|'colorSecondary'|'sizeSmall',string>;
export interface RadioProps extends Omit<CheckboxProps,'indeterminate'|'indeterminateIcon'|'classes'|'slotProps'> {classes?:Partial<RadioClasses>;slotProps?:{root?:Partial<ButtonBaseProps<'span'>>|((state:RadioProps)=>Partial<ButtonBaseProps<'span'>>);input?:CheckboxInputSlotProps|((state:RadioProps)=>CheckboxInputSlotProps)}}
export const Radio:React.ForwardRefExoticComponent<RadioProps & React.RefAttributes<HTMLSpanElement>>;
export type FormGroupClasses=Record<'root'|'row'|'error',string>;
export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {row?:boolean;classes?:Partial<FormGroupClasses>;sx?:SxProps<Theme>}
export const FormGroup:React.ForwardRefExoticComponent<FormGroupProps & React.RefAttributes<HTMLDivElement>>;
export interface RadioGroupActions {focus():void}
export interface RadioGroupProps extends Omit<FormGroupProps,'onChange'|'defaultValue'> {defaultValue?:any;value?:any;name?:string;onChange?:(event:React.ChangeEvent<HTMLInputElement>,value:string)=>void;actions?:React.Ref<RadioGroupActions>}
export const RadioGroup:React.ForwardRefExoticComponent<RadioGroupProps & React.RefAttributes<HTMLDivElement>>;
export interface RadioGroupState {name:string;value:any;onChange(event:React.ChangeEvent<HTMLInputElement>,value:string):void}
export function useRadioGroup():RadioGroupState|undefined;
export type RadioGroupClasses=FormGroupClasses;
export const radioClasses:Readonly<RadioClasses>;
export function getRadioUtilityClass(slot:string):string;
export const radioGroupClasses:Readonly<RadioGroupClasses>;
export function getRadioGroupUtilityClass(slot:string):string;
export const formGroupClasses:Readonly<FormGroupClasses>;
export function getFormGroupUtilityClass(slot:string):string;

export type SwitchClasses=Record<'root'|'edgeStart'|'edgeEnd'|'switchBase'|'colorPrimary'|'colorSecondary'|'sizeSmall'|'sizeMedium'|'checked'|'disabled'|'input'|'thumb'|'track',string>;
export type SwitchSlotProps=React.HTMLAttributes<HTMLSpanElement>&{ref?:React.Ref<HTMLSpanElement>;sx?:SxProps<Theme>};
export interface SwitchProps extends Omit<CheckboxProps,'indeterminate'|'indeterminateIcon'|'classes'|'slotProps'|'slots'|'size'> {
 size?:'small'|'medium';classes?:Partial<SwitchClasses>;slots?:{root?:React.ElementType;switchBase?:React.ElementType;input?:React.ElementType;thumb?:React.ElementType;track?:React.ElementType};
 slotProps?:{root?:SwitchSlotProps|((state:SwitchProps)=>SwitchSlotProps);switchBase?:Partial<ButtonBaseProps<'span'>>|((state:SwitchProps)=>Partial<ButtonBaseProps<'span'>>);input?:CheckboxInputSlotProps|((state:SwitchProps)=>CheckboxInputSlotProps);thumb?:SwitchSlotProps|((state:SwitchProps)=>SwitchSlotProps);track?:SwitchSlotProps|((state:SwitchProps)=>SwitchSlotProps)};
}
export const Switch:React.ForwardRefExoticComponent<SwitchProps & React.RefAttributes<HTMLSpanElement>>;
export const switchClasses:Readonly<SwitchClasses>;
export function getSwitchUtilityClass(slot:string):string;

export type ChipClasses=Record<'root'|'sizeSmall'|'sizeMedium'|'colorDefault'|'colorError'|'colorInfo'|'colorPrimary'|'colorSecondary'|'colorSuccess'|'colorWarning'|'disabled'|'clickable'|'deletable'|'outlined'|'filled'|'avatar'|'icon'|'label'|'deleteIcon'|'focusVisible',string>;
export interface ChipOwnProps {
 avatar?:React.ReactElement;icon?:React.ReactElement;deleteIcon?:React.ReactElement;label?:React.ReactNode;children?:null;
 clickable?:boolean;disabled?:boolean;skipFocusWhenDisabled?:boolean;nativeButton?:boolean;
 color?:ButtonColor|'default';size?:'small'|'medium';variant?:'filled'|'outlined';onDelete?:(event:React.SyntheticEvent)=>void;
 classes?:Partial<ChipClasses>;sx?:SxProps<Theme>;slots?:{root?:React.ElementType;label?:React.ElementType};
 slotProps?:{root?:ChipSlotProps|((state:ChipOwnProps)=>ChipSlotProps);label?:ChipSlotProps|((state:ChipOwnProps)=>ChipSlotProps)};
}
export type ChipSlotProps=React.HTMLAttributes<HTMLElement>&{ref?:React.Ref<HTMLElement>;sx?:SxProps<Theme>};
export type ChipProps<C extends React.ElementType='div'>=ChipOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof ChipOwnProps>&{component?:C};
export const Chip:<C extends React.ElementType='div'>(props:ChipProps<C>)=>React.ReactElement|null;
export const chipClasses:Readonly<ChipClasses>;
export function getChipUtilityClass(slot:string):string;

export type AvatarClasses=Record<'root'|'colorDefault'|'circular'|'rounded'|'square'|'img'|'fallback',string>;
export type AvatarRootSlotProps=React.HTMLAttributes<HTMLElement>&{ref?:React.Ref<HTMLElement>;sx?:SxProps<Theme>};
export type AvatarImageSlotProps=React.ImgHTMLAttributes<HTMLImageElement>&{ref?:React.Ref<HTMLImageElement>;sx?:SxProps<Theme>};
export interface AvatarOwnProps {
 alt?:string;src?:string;srcSet?:string;sizes?:string;children?:React.ReactNode;variant?:'circular'|'rounded'|'square';
 classes?:Partial<AvatarClasses>;sx?:SxProps<Theme>;imgProps?:AvatarImageSlotProps;
 slots?:{root?:React.ElementType;img?:React.ElementType;fallback?:React.ElementType};
 slotProps?:{root?:AvatarRootSlotProps|((state:AvatarOwnProps)=>AvatarRootSlotProps);img?:AvatarImageSlotProps|((state:AvatarOwnProps)=>AvatarImageSlotProps);fallback?:Partial<SvgIconProps>|((state:AvatarOwnProps)=>Partial<SvgIconProps>)};
}
export type AvatarProps<C extends React.ElementType='div'>=AvatarOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof AvatarOwnProps>&{component?:C};
export const Avatar:<C extends React.ElementType='div'>(props:AvatarProps<C>)=>React.ReactElement|null;
export const avatarClasses:Readonly<AvatarClasses>;
export function getAvatarUtilityClass(slot:string):string;

export type CircularProgressClasses=Record<'root'|'determinate'|'indeterminate'|'colorPrimary'|'colorSecondary'|'svg'|'track'|'circle'|'circleDisableShrink',string>;
export interface CircularProgressProps extends Omit<React.HTMLAttributes<HTMLSpanElement>,'children'> {
 color?:ButtonColor;size?:number|string;thickness?:number;variant?:'determinate'|'indeterminate';
 disableShrink?:boolean;enableTrackSlot?:boolean;min?:number;max?:number;value?:number;
 classes?:Partial<CircularProgressClasses>;sx?:SxProps<Theme>;ref?:React.Ref<HTMLSpanElement>;
}
export const CircularProgress:React.ForwardRefExoticComponent<CircularProgressProps>;
export const circularProgressClasses:Readonly<CircularProgressClasses>;
export function getCircularProgressUtilityClass(slot:string):string;

export type SkeletonClasses=Record<'root'|'text'|'rectangular'|'rounded'|'circular'|'pulse'|'wave'|'withChildren'|'fitContent'|'heightAuto',string>;
export interface SkeletonOwnProps {
 animation?:'pulse'|'wave'|false;variant?:'text'|'rectangular'|'rounded'|'circular'|(string&{});
 width?:number|string;height?:number|string;children?:React.ReactNode;
 classes?:Partial<SkeletonClasses>;sx?:SxProps<Theme>;
}
export type SkeletonProps<C extends React.ElementType='span'>=SkeletonOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof SkeletonOwnProps>&{component?:C};
export const Skeleton:<C extends React.ElementType='span'>(props:SkeletonProps<C>)=>React.ReactElement|null;
export const skeletonClasses:Readonly<SkeletonClasses>;
export function getSkeletonUtilityClass(slot:string):string;

export type ContainerClasses=Record<'root'|'disableGutters'|'fixed'|'maxWidthXs'|'maxWidthSm'|'maxWidthMd'|'maxWidthLg'|'maxWidthXl',string>;
export type ContainerClassKey=keyof ContainerClasses;
export interface ContainerOwnProps {
 children?:React.ReactNode;disableGutters?:boolean;fixed?:boolean;maxWidth?:import('vmui-system').Breakpoint|false;
 classes?:Partial<ContainerClasses>;sx?:SxProps<Theme>;
}
export type ContainerProps<C extends React.ElementType='div'>=ContainerOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof ContainerOwnProps>&{component?:C};
export const Container:<C extends React.ElementType='div'>(props:ContainerProps<C>)=>React.ReactElement|null;
export const containerClasses:Readonly<ContainerClasses>;
export function getContainerUtilityClass(slot:string):string;

export interface CardClasses {root:string}
export type CardClassKey=keyof CardClasses;
export interface CardOwnProps extends Omit<PaperOwnProps,'classes'> {raised?:boolean;classes?:Partial<CardClasses>}
export type CardProps<C extends React.ElementType='div'>=CardOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof CardOwnProps>&{component?:C};
export const Card:TextComponent<CardOwnProps,'div'>;
export const cardClasses:Readonly<CardClasses>;
export function getCardUtilityClass(slot:string):string;
export interface CardContentClasses {root:string}
export type CardContentClassKey=keyof CardContentClasses;
export interface CardContentOwnProps {children?:React.ReactNode;classes?:Partial<CardContentClasses>;sx?:SxProps<Theme>}
export type CardContentProps<C extends React.ElementType='div'>=CardContentOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof CardContentOwnProps>&{component?:C};
export const CardContent:TextComponent<CardContentOwnProps,'div'>;
export const cardContentClasses:Readonly<CardContentClasses>;
export function getCardContentUtilityClass(slot:string):string;

export type CardActionAreaClasses=Record<'root'|'focusVisible'|'focusHighlight',string>;
export type CardActionAreaClassKey=keyof CardActionAreaClasses;
export type CardActionAreaRootSlotProps=Partial<ButtonBaseProps>&{ref?:React.Ref<HTMLElement>};
export type CardActionAreaHighlightSlotProps=React.HTMLAttributes<HTMLSpanElement>&{ref?:React.Ref<HTMLSpanElement>;sx?:SxProps<Theme>};
export interface CardActionAreaOwnProps extends Omit<ButtonBaseOwnProps,'classes'> {
 classes?:Partial<CardActionAreaClasses>;
 slots?:{root?:React.ElementType;focusHighlight?:React.ElementType};
 slotProps?:{root?:CardActionAreaRootSlotProps|((state:CardActionAreaOwnProps)=>CardActionAreaRootSlotProps);focusHighlight?:CardActionAreaHighlightSlotProps|((state:CardActionAreaOwnProps)=>CardActionAreaHighlightSlotProps)};
}
export type CardActionAreaProps<C extends React.ElementType='button'>=CardActionAreaOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof CardActionAreaOwnProps>&{component?:C};
export const CardActionArea:TextComponent<CardActionAreaOwnProps,'button'>;
export const cardActionAreaClasses:Readonly<CardActionAreaClasses>;
export function getCardActionAreaUtilityClass(slot:string):string;

export type AvatarGroupClasses=Record<'root'|'avatar',string>;
export type AvatarGroupClassKey=keyof AvatarGroupClasses;
export interface AvatarGroupOwnProps {
 children?:React.ReactNode; classes?:Partial<AvatarGroupClasses>;
 max?:number; total?:number; spacing?:'small'|'medium'|number;
 variant?:AvatarOwnProps['variant']; renderSurplus?:(surplus:number)=>React.ReactNode;
 sx?:SxProps<Theme>;
 slots?:{surplus?:React.ElementType};
 slotProps?:{surplus?:Partial<AvatarProps>|((state:AvatarGroupOwnerState)=>Partial<AvatarProps>)};
}
export type AvatarGroupOwnerState=AvatarGroupOwnProps&{component:React.ElementType;max:number;spacing:'small'|'medium'|number;variant:NonNullable<AvatarOwnProps['variant']>};
export type AvatarGroupProps<C extends React.ElementType='div'>=AvatarGroupOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof AvatarGroupOwnProps>&{component?:C};
export const AvatarGroup:TextComponent<AvatarGroupOwnProps,'div'>;
export const avatarGroupClasses:Readonly<AvatarGroupClasses>;
export function getAvatarGroupUtilityClass(slot:string):string;

export type TooltipClasses=Record<'popper'|'popperInteractive'|'popperArrow'|'popperClose'|'tooltip'|'tooltipArrow'|'arrow'|'touch'|'tooltipPlacementLeft'|'tooltipPlacementRight'|'tooltipPlacementTop'|'tooltipPlacementBottom',string>;
export type TooltipClassKey=keyof TooltipClasses;
export type TooltipPlacement='auto'|'auto-start'|'auto-end'|'top'|'bottom'|'left'|'right'|'top-start'|'top-end'|'bottom-start'|'bottom-end'|'left-start'|'left-end'|'right-start'|'right-end';
export type TooltipElementProps=React.HTMLAttributes<HTMLElement>&{ref?:React.Ref<HTMLElement>;sx?:SxProps<Theme>};
export type TooltipPopperProps=TooltipElementProps&{placement?:TooltipPlacement;container?:Element|null|(()=>Element|null);disablePortal?:boolean;keepMounted?:boolean};
export type TooltipSlot<T>=T|((state:TooltipOwnerState)=>T);
export interface TooltipProps extends Omit<React.HTMLAttributes<HTMLElement>,'title'|'children'> {
 children:React.ReactElement;title:React.ReactNode;arrow?:boolean;describeChild?:boolean;
 disableFocusListener?:boolean;disableHoverListener?:boolean;disableInteractive?:boolean;disableTouchListener?:boolean;
 enterDelay?:number;enterNextDelay?:number;enterTouchDelay?:number;leaveDelay?:number;leaveTouchDelay?:number;
 followCursor?:boolean;open?:boolean;placement?:TooltipPlacement;
 onOpen?:(event:React.SyntheticEvent)=>void;onClose?:(event:React.SyntheticEvent|Event)=>void;
 classes?:Partial<TooltipClasses>;sx?:SxProps<Theme>;ref?:React.Ref<HTMLElement>;
 slots?:{popper?:React.ElementType;tooltip?:React.ElementType;arrow?:React.ElementType;transition?:React.ElementType};
 slotProps?:{popper?:TooltipSlot<TooltipPopperProps>;tooltip?:TooltipSlot<TooltipElementProps>;arrow?:TooltipSlot<TooltipElementProps>;transition?:TooltipSlot<{in?:boolean;appear?:boolean;timeout?:number;children?:React.ReactElement}>};
}
export type TooltipOwnerState=TooltipProps&{arrow:boolean;open:boolean;touch:boolean;placement:TooltipPlacement;side:string;disableInteractive:boolean};
export const Tooltip:React.ForwardRefExoticComponent<TooltipProps>;
export const tooltipClasses:Readonly<TooltipClasses>;
export function getTooltipUtilityClass(slot:string):string;

export type CollapseClasses=Record<'root'|'horizontal'|'vertical'|'entered'|'hidden'|'wrapper'|'wrapperInner',string>;
export type CollapseClassKey=keyof CollapseClasses;
export type CollapsePhase='entering'|'entered'|'exiting'|'exited'|'unmounted';
export type CollapseSlotProps=React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;sx?:SxProps<Theme>};
export interface CollapseOwnProps {
 children?:React.ReactNode; in?:boolean; collapsedSize?:string|number; orientation?:'vertical'|'horizontal';
 timeout?:number|{appear?:number;enter?:number;exit?:number}|'auto'; easing?:string|{enter?:string;exit?:string};
 appear?:boolean;enter?:boolean;exit?:boolean;mountOnEnter?:boolean;unmountOnExit?:boolean;disablePrefersReducedMotion?:boolean;
 onEnter?:(node:HTMLElement,isAppearing:boolean)=>void;onEntering?:(node:HTMLElement,isAppearing:boolean)=>void;onEntered?:(node:HTMLElement,isAppearing:boolean)=>void;
 onExit?:(node:HTMLElement)=>void;onExiting?:(node:HTMLElement)=>void;onExited?:(node:HTMLElement)=>void;addEndListener?:(node:HTMLElement,done:()=>void)=>void;
 classes?:Partial<CollapseClasses>;sx?:SxProps<Theme>;
 slots?:{root?:React.ElementType;wrapper?:React.ElementType;wrapperInner?:React.ElementType};
 slotProps?:{[K in 'root'|'wrapper'|'wrapperInner']?:CollapseSlotProps|((state:CollapseOwnerState)=>CollapseSlotProps)};
}
export type CollapseOwnerState=CollapseOwnProps&{state:CollapsePhase;orientation:'vertical'|'horizontal';in:boolean};
export type CollapseProps<C extends React.ElementType='div'>=CollapseOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof CollapseOwnProps>&{component?:C};
export const Collapse:TextComponent<CollapseOwnProps,'div'>;
export const collapseClasses:Readonly<CollapseClasses>;
export function getCollapseUtilityClass(slot:string):string;

export interface DialogTitleOwnProps extends Omit<TypographyOwnProps,'classes'> {classes?:Partial<DialogTitleClasses>}
export type DialogTitleClasses=Record<'root',string>;
export type DialogContentClasses=Record<'root'|'dividers',string>;
export type DialogActionsClasses=Record<'root'|'spacing',string>;
export interface DialogContentOwnProps {children?:React.ReactNode;dividers?:boolean;classes?:Partial<DialogContentClasses>;sx?:SxProps<Theme>}
export interface DialogActionsOwnProps {children?:React.ReactNode;disableSpacing?:boolean;classes?:Partial<DialogActionsClasses>;sx?:SxProps<Theme>}
export type DialogTitleProps<C extends React.ElementType='h2'>=DialogTitleOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof DialogTitleOwnProps>&{component?:C};
export type DialogContentProps=DialogContentOwnProps&Omit<React.ComponentPropsWithRef<'div'>,keyof DialogContentOwnProps>;
export type DialogActionsProps=DialogActionsOwnProps&Omit<React.ComponentPropsWithRef<'div'>,keyof DialogActionsOwnProps>;
export const DialogTitle:TextComponent<DialogTitleOwnProps,'h2'>;
export const DialogContent:React.ForwardRefExoticComponent<DialogContentProps>;
export const DialogActions:React.ForwardRefExoticComponent<DialogActionsProps>;
export type DialogTitleClassKey=keyof DialogTitleClasses;
export const dialogTitleClasses:Readonly<DialogTitleClasses>;
export function getDialogTitleUtilityClass(slot:string):string;
export type DialogContentClassKey=keyof DialogContentClasses;
export const dialogContentClasses:Readonly<DialogContentClasses>;
export function getDialogContentUtilityClass(slot:string):string;
export type DialogActionsClassKey=keyof DialogActionsClasses;
export const dialogActionsClasses:Readonly<DialogActionsClasses>;
export function getDialogActionsUtilityClass(slot:string):string;

export type DialogClasses=Record<'root'|'backdrop'|'container'|'scrollPaper'|'scrollBody'|'paper'|'paperWidthFalse'|'paperWidthXs'|'paperWidthSm'|'paperWidthMd'|'paperWidthLg'|'paperWidthXl'|'paperFullWidth'|'paperFullScreen',string>;
export type DialogClassKey=keyof DialogClasses;
export type DialogTransitionProps=Omit<CollapseOwnProps,'orientation'|'collapsedSize'|'slots'|'slotProps'|'timeout'>&{timeout?:number|{appear?:number;enter?:number;exit?:number};children?:React.ReactElement};
export type DialogElementProps=React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;sx?:SxProps<Theme>};
export type DialogPaperProps=Partial<PaperOwnProps>&Omit<React.HTMLAttributes<HTMLElement>,keyof PaperOwnProps>&{component?:React.ElementType;ref?:React.Ref<HTMLElement>};
export type DialogSlot<T>=T|((state:DialogOwnerState)=>T);
export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>,'onClose'|'role'> {
 open:boolean;onClose?:(event:React.SyntheticEvent|Event|{},reason:'backdropClick'|'escapeKeyDown')=>void;
 fullScreen?:boolean;fullWidth?:boolean;maxWidth?:false|'xs'|'sm'|'md'|'lg'|'xl';scroll?:'body'|'paper';role?:'dialog'|'alertdialog';
 container?:Element|null|(()=>Element|null);disablePortal?:boolean;keepMounted?:boolean;closeAfterTransition?:boolean;
 disableAutoFocus?:boolean;disableEnforceFocus?:boolean;disableRestoreFocus?:boolean;disableEscapeKeyDown?:boolean;disableScrollLock?:boolean;hideBackdrop?:boolean;
 onTransitionEnter?:()=>void;onTransitionExited?:()=>void;transitionDuration?:DialogTransitionProps['timeout'];
 classes?:Partial<DialogClasses>;sx?:SxProps<Theme>;ref?:React.Ref<HTMLDivElement>;
 PaperComponent?:React.ElementType;PaperProps?:DialogPaperProps;BackdropComponent?:React.ElementType;BackdropProps?:DialogElementProps&{invisible?:boolean};
 TransitionComponent?:React.ElementType;TransitionProps?:DialogTransitionProps;
 slots?:{root?:React.ElementType;paper?:React.ElementType;backdrop?:React.ElementType;container?:React.ElementType;transition?:React.ElementType};
 slotProps?:{root?:DialogSlot<DialogElementProps>;paper?:DialogSlot<DialogPaperProps>;backdrop?:DialogSlot<DialogElementProps&{invisible?:boolean}>;container?:DialogSlot<DialogElementProps>;transition?:DialogSlot<DialogTransitionProps>};
}
export type DialogOwnerState=DialogProps&{exited:boolean;fullScreen:boolean;fullWidth:boolean;scroll:'paper'|'body'};
export const Dialog:React.ForwardRefExoticComponent<DialogProps>;
export const dialogClasses:Readonly<DialogClasses>;
export function getDialogUtilityClass(slot:string):string;

export interface SlideProps extends Omit<DialogTransitionProps,'children'|'classes'|'sx'>, Omit<React.HTMLAttributes<HTMLElement>,'children'> {
 children:React.ReactElement;direction?:'left'|'right'|'up'|'down';
 container?:Element|null|((node:Element)=>Element|null);ref?:React.Ref<HTMLElement>;
}
export const Slide:React.ForwardRefExoticComponent<SlideProps>;

export interface DialogContentTextOwnProps extends Omit<TypographyOwnProps,'classes'> {classes?:Partial<DialogContentTextClasses>}
export type DialogContentTextClasses=Record<'root',string>;
export type DialogContentTextProps<C extends React.ElementType='p'>=DialogContentTextOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof DialogContentTextOwnProps>&{component?:C};
export const DialogContentText:TextComponent<DialogContentTextOwnProps,'p'>;
export type DialogContentTextClassKey=keyof DialogContentTextClasses;
export const dialogContentTextClasses:Readonly<DialogContentTextClasses>;
export function getDialogContentTextUtilityClass(slot:string):string;

export type DrawerClasses=Record<'root'|'docked'|'paper'|'anchorLeft'|'anchorRight'|'anchorTop'|'anchorBottom'|'modal',string>;
export type DrawerClassKey=keyof DrawerClasses;
export type DrawerModalProps=Pick<DialogProps,'container'|'disablePortal'|'keepMounted'|'closeAfterTransition'|'disableAutoFocus'|'disableEnforceFocus'|'disableRestoreFocus'|'disableEscapeKeyDown'|'disableScrollLock'|'hideBackdrop'|'onTransitionEnter'|'onTransitionExited'|'onClose'|'BackdropProps'|'BackdropComponent'>&{open?:boolean;ref?:React.Ref<HTMLDivElement>;classes?:Partial<Record<'root'|'backdrop',string>>};
export type DrawerSlot<T>=T|((state:DrawerOwnerState)=>T);
export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>,'onClose'>,DrawerModalProps {
 anchor?:'left'|'right'|'top'|'bottom';variant?:'permanent'|'persistent'|'temporary';elevation?:number;open?:boolean;
 classes?:Partial<DrawerClasses>;sx?:SxProps<Theme>;ref?:React.Ref<HTMLDivElement>;ModalProps?:DrawerModalProps;
 PaperProps?:DialogPaperProps;SlideProps?:Partial<SlideProps>;transitionDuration?:DialogTransitionProps['timeout'];
 slots?:{root?:React.ElementType;docked?:React.ElementType;paper?:React.ElementType;backdrop?:React.ElementType;transition?:React.ElementType};
 slotProps?:{root?:DrawerSlot<DrawerModalProps&DialogElementProps>;docked?:DrawerSlot<DialogElementProps>;paper?:DrawerSlot<DialogPaperProps>;backdrop?:DrawerSlot<DialogElementProps&{invisible?:boolean;classes?:{root?:string};transitionDuration?:DialogTransitionProps['timeout']}> ;transition?:DrawerSlot<Partial<SlideProps>>};
}
export type DrawerOwnerState=Omit<DrawerProps,'slots'|'slotProps'>&{anchor:'left'|'right'|'top'|'bottom';variant:'permanent'|'persistent'|'temporary';open:boolean;elevation:number;exited:boolean};
export const Drawer:React.ForwardRefExoticComponent<DrawerProps>;
export const drawerClasses:Readonly<DrawerClasses>;
export function getDrawerUtilityClass(slot:string):string;

export interface SwipeableDrawerProps extends Omit<DrawerProps,'onOpen'|'onClose'|'slots'|'slotProps'> {
 onOpen:(event:React.SyntheticEvent|Event)=>void;onClose:(event:React.SyntheticEvent|Event)=>void;
 allowSwipeInChildren?:boolean|((event:TouchEvent,swipeArea:HTMLDivElement,paper:HTMLDivElement)=>boolean);
 disableBackdropTransition?:boolean;disableDiscovery?:boolean;disableSwipeToOpen?:boolean;hysteresis?:number;minFlingVelocity?:number;swipeAreaWidth?:number;
 SwipeAreaProps?:DialogElementProps;
 slots?:DrawerProps['slots']&{swipeArea?:React.ElementType};
 slotProps?:DrawerProps['slotProps']&{swipeArea?:DrawerSlot<DialogElementProps>};
}
export const SwipeableDrawer:React.ForwardRefExoticComponent<SwipeableDrawerProps>;

export interface TableBaseProps {children?:React.ReactNode;className?:string;classes?:Partial<Record<string,string>>;sx?:SxProps<Theme>;}
export interface TableOwnProps extends TableBaseProps {padding?:'normal'|'checkbox'|'none';size?:'small'|'medium';stickyHeader?:boolean;}
export interface TableCellOwnProps extends TableBaseProps {align?:'inherit'|'left'|'center'|'right'|'justify';padding?:'normal'|'checkbox'|'none';size?:'small'|'medium';variant?:'head'|'body'|'footer';sortDirection?:'asc'|'desc'|false;}
export interface TableRowOwnProps extends TableBaseProps {hover?:boolean;selected?:boolean;}
export type TableProps<C extends React.ElementType="table">=TableOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof TableOwnProps>&{component?:C};
export const Table:<C extends React.ElementType="table">(props:TableProps<C>)=>React.ReactElement|null;
export const tableClasses:Readonly<Record<string,string>>;
export function getTableUtilityClass(slot:string):string;
export type TableHeadProps<C extends React.ElementType="thead">=TableBaseProps&Omit<React.ComponentPropsWithRef<C>,keyof TableBaseProps>&{component?:C};
export const TableHead:<C extends React.ElementType="thead">(props:TableHeadProps<C>)=>React.ReactElement|null;
export const tableHeadClasses:Readonly<Record<string,string>>;
export function getTableHeadUtilityClass(slot:string):string;
export type TableBodyProps<C extends React.ElementType="tbody">=TableBaseProps&Omit<React.ComponentPropsWithRef<C>,keyof TableBaseProps>&{component?:C};
export const TableBody:<C extends React.ElementType="tbody">(props:TableBodyProps<C>)=>React.ReactElement|null;
export const tableBodyClasses:Readonly<Record<string,string>>;
export function getTableBodyUtilityClass(slot:string):string;
export type TableFooterProps<C extends React.ElementType="tfoot">=TableBaseProps&Omit<React.ComponentPropsWithRef<C>,keyof TableBaseProps>&{component?:C};
export const TableFooter:<C extends React.ElementType="tfoot">(props:TableFooterProps<C>)=>React.ReactElement|null;
export const tableFooterClasses:Readonly<Record<string,string>>;
export function getTableFooterUtilityClass(slot:string):string;
export type TableRowProps<C extends React.ElementType="tr">=TableRowOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof TableRowOwnProps>&{component?:C};
export const TableRow:<C extends React.ElementType="tr">(props:TableRowProps<C>)=>React.ReactElement|null;
export const tableRowClasses:Readonly<Record<string,string>>;
export function getTableRowUtilityClass(slot:string):string;
export type TableCellProps<C extends React.ElementType="td">=TableCellOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof TableCellOwnProps>&{component?:C};
export const TableCell:<C extends React.ElementType="td">(props:TableCellProps<C>)=>React.ReactElement|null;
export const tableCellClasses:Readonly<Record<string,string>>;
export function getTableCellUtilityClass(slot:string):string;
export type TableContainerProps<C extends React.ElementType="div">=TableBaseProps&Omit<React.ComponentPropsWithRef<C>,keyof TableBaseProps>&{component?:C};
export const TableContainer:<C extends React.ElementType="div">(props:TableContainerProps<C>)=>React.ReactElement|null;
export const tableContainerClasses:Readonly<Record<string,string>>;
export function getTableContainerUtilityClass(slot:string):string;

export interface CreateFilterOptionsConfig<T> { ignoreAccents?:boolean; ignoreCase?:boolean; limit?:number; matchFrom?:'any'|'start'; stringify?:(option:T)=>string; trim?:boolean; }
export interface FilterOptionsState<T> {inputValue:string;getOptionLabel:(option:T)=>string;}
export function createFilterOptions<T>(config?:CreateFilterOptionsConfig<T>):(options:readonly T[],state:FilterOptionsState<T>)=>T[];
export type AutocompleteFreeSoloValueMapping<F> = F extends true ? string : never;
export type AutocompleteValue<T,M,D,F> = M extends true ? (T|AutocompleteFreeSoloValueMapping<F>)[] : D extends true ? NonNullable<T|AutocompleteFreeSoloValueMapping<F>> : T|AutocompleteFreeSoloValueMapping<F>|null;
export type AutocompleteChangeReason = 'createOption'|'selectOption'|'removeOption'|'blur'|'clear';
export type AutocompleteInputChangeReason = 'input'|'reset'|'clear'|'blur'|'selectOption'|'removeOption';
export type AutocompleteCloseReason = 'toggleInput'|'escape'|'selectOption'|'removeOption'|'blur'|'createOption';
export interface AutocompleteRenderInputParams {
 id:string;disabled:boolean;fullWidth:boolean;size?:'small';InputLabelProps:{htmlFor:string;id:string};
 InputProps:{ref:React.Ref<HTMLElement>;className:string;startAdornment:React.ReactNode;endAdornment:React.ReactNode};inputProps:React.InputHTMLAttributes<HTMLInputElement>&{ref:React.Ref<HTMLInputElement>};
}
export interface AutocompleteProps<T,M extends boolean|undefined=false,D extends boolean|undefined=false,F extends boolean|undefined=false> extends Omit<React.HTMLAttributes<HTMLDivElement>,'defaultValue'|'onChange'|'children'> {
 options:readonly T[];renderInput:(params:AutocompleteRenderInputParams)=>React.ReactNode;
 multiple?:M;disableClearable?:D;freeSolo?:F;value?:AutocompleteValue<T,M,D,F>;defaultValue?:AutocompleteValue<T,M,D,F>;inputValue?:string;open?:boolean;
 onChange?:(event:React.SyntheticEvent,value:AutocompleteValue<T,M,D,F>,reason:AutocompleteChangeReason,details?:{option:T|AutocompleteFreeSoloValueMapping<F>})=>void;
 onInputChange?:(event:React.SyntheticEvent|null,value:string,reason:AutocompleteInputChangeReason)=>void;
 onOpen?:(event:React.SyntheticEvent)=>void;onClose?:(event:React.SyntheticEvent,reason:AutocompleteCloseReason)=>void;
 onHighlightChange?:(event:React.SyntheticEvent,option:T|null,reason:'keyboard'|'mouse'|'touch'|'auto')=>void;
 getOptionLabel?:(option:T|AutocompleteFreeSoloValueMapping<F>)=>string;getOptionKey?:(option:T)=>string|number;getOptionDisabled?:(option:T)=>boolean;isOptionEqualToValue?:(option:T,value:T|AutocompleteFreeSoloValueMapping<F>)=>boolean;
 filterOptions?:(options:T[],state:FilterOptionsState<T>)=>T[];filterSelectedOptions?:boolean;
 disabled?:boolean;readOnly?:boolean;disableCloseOnSelect?:boolean;disableListWrap?:boolean;disabledItemsFocusable?:boolean;includeInputInList?:boolean;
 autoHighlight?:boolean;autoSelect?:boolean;autoComplete?:boolean;clearOnBlur?:boolean;clearOnEscape?:boolean;selectOnFocus?:boolean;handleHomeEndKeys?:boolean;openOnFocus?:boolean;blurOnSelect?:boolean|'mouse'|'touch';
 forcePopupIcon?:boolean|'auto';fullWidth?:boolean;size?:'small'|'medium';limitTags?:number;getLimitTagsText?:(more:number)=>React.ReactNode;
 renderTags?:(value:T[],getTagProps:(params:{index:number})=>{key:number;tabIndex:number;disabled:boolean;onDelete?:(event:React.SyntheticEvent)=>void},ownerState:AutocompleteProps<T,M,D,F>)=>React.ReactNode;
 renderValue?:(value:AutocompleteValue<T,M,D,F>,getItemProps:(params?:{index?:number})=>{key:number;tabIndex:number;disabled:boolean;onDelete?:(event:React.SyntheticEvent)=>void},ownerState:AutocompleteProps<T,M,D,F>)=>React.ReactNode;
 renderOption?:(props:React.HTMLAttributes<HTMLLIElement>&{key:React.Key},option:T,state:{selected:boolean;index:number;inputValue:string},ownerState:AutocompleteProps<T,M,D,F>)=>React.ReactNode;
 groupBy?:(option:T)=>string;renderGroup?:(params:{key:number;group:string;children:React.ReactNode})=>React.ReactNode;
 loading?:boolean;loadingText?:React.ReactNode;noOptionsText?:React.ReactNode;clearText?:string;openText?:string;closeText?:string;clearIcon?:React.ReactNode;popupIcon?:React.ReactNode;
 disablePortal?:boolean;classes?:Partial<Record<AutocompleteClassKey,string>>;sx?:SxProps<Theme>;
 slots?:{listbox?:React.ElementType;paper?:React.ElementType;popper?:React.ElementType};
 slotProps?:Partial<Record<'listbox'|'paper'|'popper'|'chip'|'clearIndicator'|'popupIndicator',Record<string,unknown>|((state:AutocompleteProps<T,M,D,F>)=>Record<string,unknown>)>>;
 ChipProps?:Partial<ChipProps>;ListboxProps?:React.HTMLAttributes<HTMLElement>&{ref?:React.Ref<HTMLElement>};ListboxComponent?:React.ElementType;PaperComponent?:React.ElementType;PopperComponent?:React.ElementType;
}
export function Autocomplete<T,M extends boolean|undefined=false,D extends boolean|undefined=false,F extends boolean|undefined=false>(props:AutocompleteProps<T,M,D,F>&React.RefAttributes<HTMLDivElement>):React.ReactElement|null;
export type AutocompleteClassKey='root'|'expanded'|'fullWidth'|'focused'|'focusVisible'|'tag'|'tagSizeSmall'|'tagSizeMedium'|'hasPopupIcon'|'hasClearIcon'|'inputRoot'|'input'|'inputFocused'|'endAdornment'|'clearIndicator'|'popupIndicator'|'popupIndicatorOpen'|'popper'|'popperDisablePortal'|'paper'|'listbox'|'loading'|'noOptions'|'option'|'groupLabel'|'groupUl';
export const autocompleteClasses:Readonly<Record<AutocompleteClassKey,string>>;
export function getAutocompleteUtilityClass(slot:string):string;

export interface TableSortLabelOwnProps extends ButtonBaseOwnProps {
 active?:boolean;direction?:'asc'|'desc';hideSortIcon?:boolean;IconComponent?:React.ElementType;
 slots?:{root?:React.ElementType;icon?:React.ElementType};
 slotProps?:Partial<Record<'root'|'icon',Record<string,unknown>|((state:TableSortLabelOwnProps)=>Record<string,unknown>)>>;
}
export type TableSortLabelProps<C extends React.ElementType='span'>=TableSortLabelOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof TableSortLabelOwnProps>&{component?:C};
export const TableSortLabel:<C extends React.ElementType='span'>(props:TableSortLabelProps<C>)=>React.ReactElement|null;
export const tableSortLabelClasses:Readonly<Record<'root'|'active'|'icon'|'directionAsc'|'directionDesc',string>>;
export function getTableSortLabelUtilityClass(slot:string):string;
export type PaginationItemType='page'|'first'|'last'|'previous'|'next'|'start-ellipsis'|'end-ellipsis';
export interface UsePaginationProps {
 count?:number;page?:number;defaultPage?:number;boundaryCount?:number;siblingCount?:number;disabled?:boolean;
 showFirstButton?:boolean;showLastButton?:boolean;hideNextButton?:boolean;hidePrevButton?:boolean;componentName?:string;
 onChange?:(event:React.ChangeEvent<unknown>,page:number)=>void;
}
export interface UsePaginationItem {
 type:PaginationItemType;page:number|null;selected:boolean;disabled:boolean;onClick:React.ReactEventHandler; 'aria-current'?:'page';
}
export interface UsePaginationResult {items:UsePaginationItem[];}
export function usePagination(props?:UsePaginationProps):UsePaginationResult;
export interface PaginationItemOwnProps extends Omit<ButtonBaseOwnProps,'children'> {
 page?:React.ReactNode;selected?:boolean;color?:'standard'|'primary'|'secondary'|(string&{});shape?:'circular'|'rounded';size?:'small'|'medium'|'large';variant?:'text'|'outlined';type?:PaginationItemType;
 slots?:Partial<Record<'first'|'last'|'previous'|'next',React.ElementType>>;
 slotProps?:Partial<Record<'first'|'last'|'previous'|'next',Record<string,unknown>|((state:PaginationItemOwnProps)=>Record<string,unknown>)>>;
 components?:Partial<Record<'First'|'Last'|'Previous'|'Next',React.ElementType>>;
}
export type PaginationItemProps<C extends React.ElementType='button'>=PaginationItemOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof PaginationItemOwnProps>&{component?:C};
export const PaginationItem:<C extends React.ElementType='button'>(props:PaginationItemProps<C>)=>React.ReactElement|null;
export const paginationItemClasses:Readonly<Record<string,string>>;
export function getPaginationItemUtilityClass(slot:string):string;
export interface PaginationRenderItemParams extends UsePaginationItem {color:PaginationItemOwnProps['color'];shape:PaginationItemOwnProps['shape'];size:PaginationItemOwnProps['size'];variant:PaginationItemOwnProps['variant'];'aria-label'?:string;}
export interface PaginationProps extends UsePaginationProps,Omit<React.HTMLAttributes<HTMLElement>,'onChange'|'children'|'defaultValue'> {
 color?:PaginationItemOwnProps['color'];shape?:PaginationItemOwnProps['shape'];size?:PaginationItemOwnProps['size'];variant?:PaginationItemOwnProps['variant'];
 classes?:Partial<Record<'root'|'ul'|'outlined'|'text',string>>;sx?:SxProps<Theme>;
 getItemAriaLabel?:(type:PaginationItemType,page:number|null,selected:boolean)=>string;
 renderItem?:(item:PaginationRenderItemParams)=>React.ReactNode;
}
export const Pagination:React.ForwardRefExoticComponent<PaginationProps&React.RefAttributes<HTMLElement>>;
export const paginationClasses:Readonly<Record<'root'|'ul'|'outlined'|'text',string>>;
export function getPaginationUtilityClass(slot:string):string;

export interface LinearProgressProps extends Omit<React.HTMLAttributes<HTMLSpanElement>,'children'> {
 color?:'primary'|'secondary'|'error'|'info'|'success'|'warning'|'inherit'|(string&{});
 variant?:'determinate'|'indeterminate'|'buffer'|'query';
 min?:number;max?:number;value?:number;valueBuffer?:number;
 classes?:Partial<Record<LinearProgressClassKey,string>>;sx?:SxProps<Theme>;
}
export type LinearProgressClassKey='root'|'colorPrimary'|'colorSecondary'|'determinate'|'indeterminate'|'buffer'|'query'|'dashed'|'bar'|'bar1'|'bar2';
export const LinearProgress:React.ForwardRefExoticComponent<LinearProgressProps&React.RefAttributes<HTMLSpanElement>>;
export const linearProgressClasses:Readonly<Record<LinearProgressClassKey,string>>;
export function getLinearProgressUtilityClass(slot:string):string;

export type AlertColor='success'|'info'|'warning'|'error';
export type AlertClassKey='root'|'filled'|'outlined'|'standard'|'colorSuccess'|'colorInfo'|'colorWarning'|'colorError'|'icon'|'message'|'action';
export type AlertSlot<T>=T|((state:AlertOwnProps)=>T);
export interface AlertOwnProps extends Omit<PaperOwnProps,'classes'|'variant'> {
 severity?:AlertColor|(string&{});color?:AlertColor|(string&{});variant?:'standard'|'outlined'|'filled';
 role?:React.AriaRole;icon?:React.ReactNode;iconMapping?:Partial<Record<AlertColor,React.ReactNode>>&Record<string,React.ReactNode>;
 action?:React.ReactNode;onClose?:(event:React.SyntheticEvent)=>void;closeText?:string;
 classes?:Partial<Record<AlertClassKey,string>>;
 slots?:Partial<Record<'root'|'icon'|'message'|'action'|'closeButton'|'closeIcon',React.ElementType>>;
 slotProps?:{root?:AlertSlot<Partial<PaperProps>>;icon?:AlertSlot<React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;sx?:SxProps<Theme>}>;message?:AlertSlot<React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;sx?:SxProps<Theme>}>;action?:AlertSlot<React.HTMLAttributes<HTMLDivElement>&{ref?:React.Ref<HTMLDivElement>;sx?:SxProps<Theme>}>;closeButton?:AlertSlot<Partial<IconButtonProps>>;closeIcon?:AlertSlot<Partial<SvgIconProps>>};
}
export type AlertProps<C extends React.ElementType='div'>=AlertOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof AlertOwnProps>&{component?:C};
export const Alert:<C extends React.ElementType='div'>(props:AlertProps<C>)=>React.ReactElement|null;
export const alertClasses:Readonly<Record<AlertClassKey,string>>;
export function getAlertUtilityClass(slot:string):string;
export type AlertTitleClassKey='root';
export type AlertTitleProps<C extends React.ElementType='div'>=Omit<TypographyProps<C>,'classes'>&{classes?:Partial<Record<AlertTitleClassKey,string>>};
export const AlertTitle:<C extends React.ElementType='div'>(props:AlertTitleProps<C>)=>React.ReactElement|null;
export const alertTitleClasses:Readonly<Record<AlertTitleClassKey,string>>;
export function getAlertTitleUtilityClass(slot:string):string;

export interface BadgeOrigin {vertical?:'top'|'bottom';horizontal?:'left'|'right';}
export type BadgeClassKey='root'|'badge'|'standard'|'dot'|'invisible'|`color${'Primary'|'Secondary'|'Error'|'Warning'|'Info'|'Success'}`|`anchorOrigin${'Top'|'Bottom'}${'Left'|'Right'}${''|'Rectangular'|'Circular'}`|'overlapRectangular'|'overlapCircular';
export interface BadgeOwnProps {
 children?:React.ReactNode;badgeContent?:React.ReactNode;anchorOrigin?:BadgeOrigin;color?:'default'|'primary'|'secondary'|'error'|'warning'|'info'|'success'|(string&{});
 overlap?:'rectangular'|'circular';variant?:'standard'|'dot';invisible?:boolean;max?:number;showZero?:boolean;
 classes?:Partial<Record<BadgeClassKey,string>>;sx?:SxProps<Theme>;
 slots?:{root?:React.ElementType;badge?:React.ElementType};
 slotProps?:{[K in 'root'|'badge']?:BadgeElementProps|((state:BadgeOwnerState)=>BadgeElementProps)};
}
export type BadgeElementProps=React.HTMLAttributes<HTMLSpanElement>&{ref?:React.Ref<HTMLSpanElement>;sx?:SxProps<Theme>};
export type BadgeOwnerState=Omit<BadgeOwnProps,'slots'|'slotProps'>&{invisible:boolean;max:number;displayValue:React.ReactNode;showZero:boolean;anchorOrigin:Required<BadgeOrigin>;color:string;overlap:'rectangular'|'circular';variant:'standard'|'dot'};
export type BadgeProps<C extends React.ElementType='span'>=BadgeOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof BadgeOwnProps>&{component?:C};
export const Badge:<C extends React.ElementType='span'>(props:BadgeProps<C>)=>React.ReactElement|null;
export const badgeClasses:Readonly<Record<BadgeClassKey,string>>;
export function getBadgeUtilityClass(slot:string):string;
export const BadgeRoot:React.ComponentType<BadgeElementProps>;
export const BadgeMark:React.ComponentType<BadgeElementProps&{ownerState:BadgeOwnerState}>;

export type ListItemButtonClassKey='root'|'focusVisible'|'dense'|'alignItemsFlexStart'|'disabled'|'divider'|'gutters'|'selected';
export interface ListItemButtonOwnProps extends ButtonBaseOwnProps {alignItems?:'center'|'flex-start';autoFocus?:boolean;dense?:boolean;disableGutters?:boolean;divider?:boolean;selected?:boolean;href?:string;classes?:Partial<Record<ListItemButtonClassKey,string>>;}
export type ListItemButtonProps<C extends React.ElementType='div'>=ListItemButtonOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof ListItemButtonOwnProps>&{component?:C};
export const ListItemButton:<C extends React.ElementType='div'>(props:ListItemButtonProps<C>)=>React.ReactElement|null;
export const listItemButtonClasses:Readonly<Record<ListItemButtonClassKey,string>>;
export function getListItemButtonUtilityClass(slot:string):string;

export type AppBarClassKey='root'|'positionFixed'|'positionAbsolute'|'positionSticky'|'positionStatic'|'positionRelative'|'colorDefault'|'colorPrimary'|'colorSecondary'|'colorInherit'|'colorTransparent'|'colorError'|'colorInfo'|'colorSuccess'|'colorWarning';
export interface AppBarOwnProps extends Omit<PaperOwnProps,'classes'> {color?:'default'|'primary'|'secondary'|'inherit'|'transparent'|'error'|'info'|'success'|'warning'|(string & {});position?:'fixed'|'absolute'|'sticky'|'static'|'relative';enableColorOnDark?:boolean;classes?:Partial<Record<AppBarClassKey,string>>;}
export type AppBarProps<C extends React.ElementType='header'>=AppBarOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof AppBarOwnProps>&{component?:C};
export const AppBar:<C extends React.ElementType='header'>(props:AppBarProps<C>)=>React.ReactElement|null;
export const appBarClasses:Readonly<Record<AppBarClassKey,string>>;
export function getAppBarUtilityClass(slot:string):string;
export type ToolbarClassKey='root'|'gutters'|'regular'|'dense';
export interface ToolbarOwnProps {children?:React.ReactNode;className?:string;disableGutters?:boolean;variant?:'regular'|'dense'|(string & {});classes?:Partial<Record<ToolbarClassKey,string>>;sx?:SxProps<Theme>;}
export type ToolbarProps<C extends React.ElementType='div'>=ToolbarOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof ToolbarOwnProps>&{component?:C};
export const Toolbar:<C extends React.ElementType='div'>(props:ToolbarProps<C>)=>React.ReactElement|null;
export const toolbarClasses:Readonly<Record<ToolbarClassKey,string>>;
export function getToolbarUtilityClass(slot:string):string;

export type AccordionSummaryClassKey='root'|'expanded'|'focusVisible'|'disabled'|'gutters'|'content'|'expandIconWrapper';
export interface AccordionSummaryOwnProps extends ButtonBaseOwnProps {
 expandIcon?:React.ReactNode;classes?:Partial<Record<AccordionSummaryClassKey,string>>;
 slots?:{root?:React.ElementType;content?:React.ElementType;expandIconWrapper?:React.ElementType};
 slotProps?:{root?:AccordionSummarySlot<Partial<ButtonBaseProps>>;content?:AccordionSummarySlot<AccordionSummaryElementProps>;expandIconWrapper?:AccordionSummarySlot<AccordionSummaryElementProps>};
}
export type AccordionSummaryElementProps=React.HTMLAttributes<HTMLSpanElement>&{ref?:React.Ref<HTMLSpanElement>;sx?:SxProps<Theme>};
export type AccordionSummaryOwnerState=AccordionSummaryOwnProps&{expanded?:boolean;disabled:boolean;disableGutters?:boolean};
export type AccordionSummarySlot<T>=T|((state:AccordionSummaryOwnerState)=>T);
export type AccordionSummaryProps<C extends React.ElementType='button'>=AccordionSummaryOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof AccordionSummaryOwnProps>&{component?:C};
export const AccordionSummary:<C extends React.ElementType='button'>(props:AccordionSummaryProps<C>)=>React.ReactElement|null;
export const accordionSummaryClasses:Readonly<Record<AccordionSummaryClassKey,string>>;
export function getAccordionSummaryUtilityClass(slot:string):string;
export type AccordionDetailsClassKey='root';
export interface AccordionDetailsProps extends React.HTMLAttributes<HTMLDivElement>{classes?:Partial<Record<AccordionDetailsClassKey,string>>;sx?:SxProps<Theme>;}
export const AccordionDetails:React.ForwardRefExoticComponent<AccordionDetailsProps&React.RefAttributes<HTMLDivElement>>;
export const accordionDetailsClasses:Readonly<Record<AccordionDetailsClassKey,string>>;
export function getAccordionDetailsUtilityClass(slot:string):string;

export type AccordionClassKey = 'root'|'heading'|'region'|'rounded'|'expanded'|'disabled'|'gutters';
export type AccordionOwnerState = {expanded:boolean;disabled:boolean;disableGutters:boolean;square:boolean};
type AccordionSlotProps<T> = T | ((state:AccordionOwnerState)=>T);
type AccordionDOMSlot = React.HTMLAttributes<HTMLElement> & {component?:React.ElementType;ref?:React.Ref<HTMLElement>};
export interface AccordionOwnProps extends Omit<PaperOwnProps,'classes'|'children'> {
  children: React.ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  disableGutters?: boolean;
  onChange?: (event:React.SyntheticEvent, expanded:boolean)=>void;
  classes?: Partial<Record<AccordionClassKey,string>>;
  slots?: Partial<Record<'root'|'heading'|'region'|'transition',React.ElementType>>;
  slotProps?: {root?:AccordionSlotProps<Partial<PaperProps>>;heading?:AccordionSlotProps<AccordionDOMSlot>;region?:AccordionSlotProps<AccordionDOMSlot>;transition?:AccordionSlotProps<Partial<CollapseProps>>};
}
export type AccordionProps<C extends React.ElementType='div'> = AccordionOwnProps & Omit<React.ComponentPropsWithRef<C>,keyof AccordionOwnProps> & {component?:C};
export const Accordion:<C extends React.ElementType='div'>(props:AccordionProps<C>)=>React.ReactElement|null;
export const accordionClasses:Readonly<Record<AccordionClassKey,string>>;
export function getAccordionUtilityClass(slot:string):string;

export type TabClassKey = 'root'|'labelIcon'|'textColorInherit'|'textColorPrimary'|'textColorSecondary'|'selected'|'disabled'|'fullWidth'|'wrapped'|'icon';
export type TabsClassKey = 'root'|'vertical'|'list'|'centered'|'scroller'|'fixed'|'scrollableX'|'scrollableY'|'hideScrollbar'|'scrollButtons'|'scrollButtonsHideMobile'|'indicator';
export type TabProps<C extends React.ElementType='button'> = Omit<ButtonBaseProps<C>,'children'|'classes'|'value'|'onChange'> & {
  label?:React.ReactNode;icon?:React.ReactElement|string;iconPosition?:'top'|'bottom'|'start'|'end';
  value?:unknown;wrapped?:boolean;classes?:Partial<Record<TabClassKey,string>>;
};
export const Tab:<C extends React.ElementType='button'>(props:TabProps<C>)=>React.ReactElement|null;
export type TabsProps<C extends React.ElementType='div',V=any> = Omit<React.ComponentPropsWithRef<C>,'onChange'|'value'> & {
  component?:C; children?:React.ReactNode; value:V; onChange?:(event:React.SyntheticEvent,value:V)=>void;
  variant?:'standard'|'fullWidth';orientation?:'horizontal'|'vertical';selectionFollowsFocus?:boolean;
  indicatorColor?:'primary'|'secondary';textColor?:'inherit'|'primary'|'secondary';centered?:boolean;
  classes?:Partial<Record<TabsClassKey,string>>;sx?:SxProps<Theme>;
};
export const Tabs:<C extends React.ElementType='div',V=any>(props:TabsProps<C,V>)=>React.ReactElement|null;
export const tabClasses:Readonly<Record<TabClassKey,string>>;
export const tabsClasses:Readonly<Record<TabsClassKey,string>>;
export function getTabUtilityClass(slot:string):string;
export function getTabsUtilityClass(slot:string):string;

export type BreadcrumbsClassKey = 'root'|'ol'|'li'|'separator';
export type BreadcrumbsProps<C extends React.ElementType='nav'> = Omit<TypographyProps<C>,'classes'> & {
  classes?: Partial<Record<BreadcrumbsClassKey,string>>;
  maxItems?:number; itemsBeforeCollapse?:number; itemsAfterCollapse?:number;
  separator?:React.ReactNode; expandText?:string; slots?:{CollapsedIcon?:React.ElementType};
  slotProps?:{collapsedIcon?:Partial<SvgIconProps> | ((state:BreadcrumbsProps & {expanded:boolean})=>Partial<SvgIconProps>)};
};
export const Breadcrumbs:<C extends React.ElementType='nav'>(props:BreadcrumbsProps<C>)=>React.ReactElement|null;
export const breadcrumbsClasses:Readonly<Record<BreadcrumbsClassKey,string>>;
export function getBreadcrumbsUtilityClass(slot:string):string;

export type SnackbarCloseReason = 'timeout' | 'clickaway' | 'escapeKeyDown';
export type SnackbarOrigin = { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' };
export type SnackbarClassKey = 'root' | `anchorOrigin${Capitalize<SnackbarOrigin['vertical']>}${Capitalize<SnackbarOrigin['horizontal']>}`;
export type SnackbarContentClassKey = 'root' | 'message' | 'action';
export type SnackbarContentProps = Omit<PaperProps, 'classes'> & {
  classes?: Partial<Record<SnackbarContentClassKey, string>>; message?: React.ReactNode; action?: React.ReactNode;
};
export type SnackbarProps = Omit<React.ComponentPropsWithRef<'div'>, 'children' | 'onClose'> & {
  children?: React.ReactElement; message?: React.ReactNode; action?: React.ReactNode;
  open?: boolean; anchorOrigin?: SnackbarOrigin; autoHideDuration?: number | null; resumeHideDuration?: number;
  disableWindowBlurListener?: boolean; transitionDuration?: number | { enter?: number; exit?: number };
  onClose?: (event: React.SyntheticEvent | Event | null, reason: SnackbarCloseReason) => void;
  classes?: Partial<Record<SnackbarClassKey,string>>; sx?: SxProps<Theme>;
};
export const Snackbar: React.ForwardRefExoticComponent<SnackbarProps>;
export const SnackbarContent: React.ForwardRefExoticComponent<SnackbarContentProps>;
export const snackbarClasses: Readonly<Record<SnackbarClassKey,string>>;
export const snackbarContentClasses: Readonly<Record<SnackbarContentClassKey,string>>;
export function getSnackbarUtilityClass(slot: string): string;
export function getSnackbarContentUtilityClass(slot: string): string;

export {Stack, stackClasses, getStackUtilityClass, type StackProps, type StackClasses, type StackClassKey} from 'vmui-system';

export {Grid, gridClasses, getGridUtilityClass, type GridProps, type GridClasses, type GridClassKey, type GridSize} from 'vmui-system';

export type RatingClassKey = "root" | "sizeSmall" | "sizeMedium" | "sizeLarge" | "readOnly" | "disabled" | "focusVisible" | "visuallyHidden" | "pristine" | "label" | "labelEmptyValueActive" | "icon" | "iconEmpty" | "iconFilled" | "iconHover" | "iconFocus" | "iconActive" | "decimal";
export type RatingClasses = Readonly<Record<RatingClassKey, string>>;
export const ratingClasses: RatingClasses;
export function getRatingUtilityClass(slot: string): string;
export interface RatingOwnProps {
  name?: string;
  value?: number | null;
  defaultValue?: number | null;
  max?: number;
  precision?: 1;
  disabled?: boolean;
  readOnly?: boolean;
  size?: "small" | "medium" | "large";
  getLabelText?: (value: number) => string;
  emptyLabelText?: React.ReactNode;
  icon?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  highlightSelectedOnly?: boolean;
  onChange?: (event: React.SyntheticEvent, value: number | null) => void;
  onChangeActive?: (event: React.SyntheticEvent, value: number) => void;
  classes?: Partial<RatingClasses>;
  sx?: SxProps<Theme>;
}
export type RatingProps<C extends React.ElementType = "span"> = RatingOwnProps & {component?: C} & Omit<React.ComponentPropsWithRef<C>, keyof RatingOwnProps>;
export function Rating<C extends React.ElementType = "span">(props: RatingProps<C>): React.ReactElement;

export interface ClickAwayListenerProps {
  children: React.ReactElement;
  onClickAway: (event: MouseEvent | TouchEvent) => void;
  mouseEvent?: 'onClick' | 'onMouseDown' | 'onMouseUp' | 'onPointerDown' | 'onPointerUp' | false;
  touchEvent?: 'onTouchStart' | 'onTouchEnd' | false;
  disableReactTree?: boolean;
}
export function ClickAwayListener(props: ClickAwayListenerProps): React.ReactElement;

export interface GrowProps extends Omit<SlideProps, "direction" | "container" | "timeout"> {
  timeout?: CollapseOwnProps["timeout"];
}
export const Grow: React.ForwardRefExoticComponent<GrowProps> & { muiSupportAuto: boolean };

export type PopperPlacementType = "top" | "bottom" | "left" | "right" | `${"top" | "bottom" | "left" | "right"}-${"start" | "end"}`;
export interface PopperVirtualElement { getBoundingClientRect(): DOMRect; contextElement?: Element; }
export interface PopperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  open: boolean;
  anchorEl?: Element | PopperVirtualElement | null | (() => Element | PopperVirtualElement | null);
  children?: React.ReactNode | ((options: {placement: PopperPlacementType}) => React.ReactNode);
  placement?: PopperPlacementType;
  disablePortal?: boolean;
  keepMounted?: boolean;
  container?: Element | DocumentFragment | null | (() => Element | DocumentFragment | null);
  component?: React.ElementType;
  classes?: {root?: string};
  sx?: SxProps<Theme>;
}
export const Popper: React.ForwardRefExoticComponent<PopperProps & React.RefAttributes<HTMLDivElement>>;
export const popperClasses: Readonly<{root: string}>;
export function getPopperUtilityClass(slot: string): string;

export type SliderClassKey = "root"|"active"|"colorPrimary"|"colorSecondary"|"colorError"|"colorInfo"|"colorSuccess"|"colorWarning"|"disabled"|"dragging"|"focusVisible"|"mark"|"markActive"|"marked"|"markLabel"|"markLabelActive"|"rail"|"sizeSmall"|"thumb"|"track"|"trackInverted"|"trackFalse"|"valueLabel"|"valueLabelOpen"|"valueLabelCircle"|"valueLabelLabel"|"vertical";
export type SliderClasses = Readonly<Record<SliderClassKey,string>>;
export const sliderClasses:SliderClasses;
export function getSliderUtilityClass(slot: string): string;
export interface SliderProps extends Omit<React.HTMLAttributes<HTMLSpanElement>,"onChange"|"defaultValue"|"color"> {
 value?:number; defaultValue?:number; min?:number; max?:number; step?:number|null; shiftStep?:number;
 marks?: readonly {value:number;label?:React.ReactNode}[]; disabled?:boolean; color?:ButtonColor; size?:"small"|"medium";
 name?:string; component?:React.ElementType; track?:false|"normal"|"inverted"; orientation?:"horizontal"; valueLabelDisplay?:"off";
 getAriaValueText?:(value:number,index:number)=>string;
 onChange?:(event:Event,value:number,activeThumb:number)=>void;
 onChangeCommitted?:(event:Event,value:number)=>void;
 classes?:Partial<SliderClasses>; sx?:SxProps<Theme>;
}
export const Slider:React.ForwardRefExoticComponent<SliderProps & React.RefAttributes<HTMLSpanElement>>;

export type StepperClassKey="root"|"horizontal"|"vertical"|"alternativeLabel"|"nonLinear";
export type StepperClasses=Readonly<Record<StepperClassKey,string>>;
export const stepperClasses:StepperClasses;
export function getStepperUtilityClass(slot:string):string;
interface StepperOwnProps { activeStep?:number; alternativeLabel?:boolean; nonLinear?:boolean; orientation?:"horizontal"|"vertical"; connector?:React.ReactElement|null; classes?:Partial<StepperClasses>; sx?:SxProps<Theme>; }
export type StepperProps<C extends React.ElementType = "ol"> = StepperOwnProps & {component?: C} & Omit<React.ComponentPropsWithRef<C>,keyof StepperOwnProps | "component">;
export function Stepper<C extends React.ElementType = "ol">(props:StepperProps<C>):React.ReactElement|null;

export type StepClassKey="root"|"horizontal"|"vertical"|"alternativeLabel"|"completed";
export type StepClasses=Readonly<Record<StepClassKey,string>>;
export const stepClasses:StepClasses;
export function getStepUtilityClass(slot:string):string;
interface StepOwnProps { active?:boolean; completed?:boolean; disabled?:boolean; expanded?:boolean; index?:number; last?:boolean; classes?:Partial<StepClasses>; sx?:SxProps<Theme>; }
export type StepProps<C extends React.ElementType = "li"> = StepOwnProps & {component?: C} & Omit<React.ComponentPropsWithRef<C>,keyof StepOwnProps | "component">;
export function Step<C extends React.ElementType = "li">(props:StepProps<C>):React.ReactElement|null;

export type StepLabelClassKey="root"|"horizontal"|"vertical"|"label"|"active"|"completed"|"error"|"disabled"|"iconContainer"|"alternativeLabel"|"labelContainer";
export type StepLabelClasses=Readonly<Record<StepLabelClassKey,string>>;
export const stepLabelClasses:StepLabelClasses;
export function getStepLabelUtilityClass(slot:string):string;
interface StepLabelOwnProps { error?:boolean; icon?:React.ReactNode; optional?:React.ReactNode; classes?:Partial<StepLabelClasses>; sx?:SxProps<Theme>; }
export type StepLabelProps = React.ComponentPropsWithRef<"span"> & StepLabelOwnProps;
export const StepLabel: React.ForwardRefExoticComponent<StepLabelProps>;

export type StepContentClassKey = "root" | "last" | "transition";
export type StepContentClasses = Readonly<Record<StepContentClassKey,string>>;
export const stepContentClasses:StepContentClasses;
export function getStepContentUtilityClass(slot:string):string;
export interface StepContentProps extends React.HTMLAttributes<HTMLDivElement> {
 classes?:Partial<StepContentClasses>; sx?:SxProps<Theme>;
 transitionDuration?:CollapseOwnProps["timeout"];
 slots?:{transition?:React.ElementType};
 slotProps?:{transition?:Partial<CollapseProps> | ((state:StepContentProps & {last:boolean;alternativeLabel:boolean})=>Partial<CollapseProps>)};
}
export const StepContent:React.ForwardRefExoticComponent<StepContentProps & React.RefAttributes<HTMLDivElement>>;

export type ListItemClassKey = 'root'|'dense'|'alignItemsFlexStart'|'divider'|'gutters'|'padding'|'secondaryAction';
export interface ListItemOwnProps {
  alignItems?: 'center'|'flex-start'; children?: React.ReactNode; dense?: boolean; disableGutters?: boolean; disablePadding?: boolean;
  divider?: boolean; secondaryAction?: React.ReactNode; classes?: Partial<Record<ListItemClassKey,string>>; sx?: SxProps<Theme>;
  slots?: {root?: React.ElementType; secondaryAction?: React.ElementType};
  slotProps?: Partial<Record<'root'|'secondaryAction', React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement> | ((state: ListItemOwnProps) => React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>)>>;
}
export type ListItemProps<C extends React.ElementType='li'>=ListItemOwnProps&Omit<React.ComponentPropsWithRef<C>,keyof ListItemOwnProps>&{component?:C};
export const ListItem:<C extends React.ElementType='li'>(props:ListItemProps<C>)=>React.ReactElement|null;
export const listItemClasses:Readonly<Record<ListItemClassKey,string>>;
export function getListItemUtilityClass(slot:string):string;

export interface CssBaselineProps { children?: React.ReactNode; enableColorScheme?: boolean; classes?: Partial<Record<never,string>> }
export function CssBaseline(props: CssBaselineProps): React.ReactElement;
