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
