import type * as React from 'react';
import type {ComponentSelector, Interpolation} from 'vemotion-serialize';
import type {PropsOf, Theme} from 'vemotion-react';

type IntrinsicElements = React.JSX.IntrinsicElements;

/** StyledOptions whose shouldForwardProp is a type guard, narrowing the forwarded props. */
export interface FilteringStyledOptions<Props = Record<string, any>, ForwardedProps extends keyof Props & string = keyof Props & string> {
  label?: string;
  shouldForwardProp?: (propName: string) => propName is ForwardedProps;
  target?: string;
}

export interface StyledOptions<Props = Record<string, any>> {
  /** Appended to the class name. */
  label?: string;
  /** Which props reach the rendered element or component. */
  shouldForwardProp?: (propName: string) => boolean;
  /** A stable class name added to the element (component selectors). */
  target?: string;
}

/**
 * @typeparam ComponentProps Props kept by withComponent
 * @typeparam SpecificComponentProps Props not kept by withComponent
 */
export interface StyledComponent<ComponentProps extends {}, SpecificComponentProps extends {} = {}, JSXProps extends {} = {}>
  extends React.FC<ComponentProps & SpecificComponentProps & JSXProps>,
    ComponentSelector {
  withComponent<C extends React.ComponentClass<React.ComponentProps<C>>>(component: C): StyledComponent<ComponentProps & PropsOf<C>, {}, {ref?: React.Ref<InstanceType<C>>}>;
  withComponent<C extends React.ComponentType<React.ComponentProps<C>>>(component: C): StyledComponent<ComponentProps & PropsOf<C>>;
  withComponent<Tag extends keyof IntrinsicElements>(tag: Tag): StyledComponent<ComponentProps, IntrinsicElements[Tag]>;
}

/** The function styled(tag) returns: it takes styles and creates the component. */
export interface CreateStyledComponent<ComponentProps extends {}, SpecificComponentProps extends {} = {}, JSXProps extends {} = {}> {
  (template: TemplateStringsArray, ...styles: Array<Interpolation<ComponentProps & SpecificComponentProps & {theme: Theme}>>): StyledComponent<ComponentProps, SpecificComponentProps, JSXProps>;
  <AdditionalProps extends {}>(
    template: TemplateStringsArray,
    ...styles: Array<Interpolation<ComponentProps & SpecificComponentProps & AdditionalProps & {theme: Theme}>>
  ): StyledComponent<ComponentProps & AdditionalProps, SpecificComponentProps, JSXProps>;
  <AdditionalProps extends {} = {}>(
    ...styles: Array<Interpolation<ComponentProps & SpecificComponentProps & AdditionalProps & {theme: Theme}>>
  ): StyledComponent<ComponentProps & AdditionalProps, SpecificComponentProps, JSXProps>;
}

/** styled(component or tag, options?). */
export interface CreateStyled {
  <C extends React.ComponentClass<React.ComponentProps<C>>, ForwardedProps extends keyof React.ComponentProps<C> & string = keyof React.ComponentProps<C> & string>(
    component: C,
    options: FilteringStyledOptions<React.ComponentProps<C>, ForwardedProps>,
  ): CreateStyledComponent<Pick<PropsOf<C>, ForwardedProps> & {theme?: Theme}, {}, {ref?: React.Ref<InstanceType<C>>}>;
  <C extends React.ComponentClass<React.ComponentProps<C>>>(component: C, options?: StyledOptions<React.ComponentProps<C>>): CreateStyledComponent<PropsOf<C> & {theme?: Theme}, {}, {ref?: React.Ref<InstanceType<C>>}>;
  <C extends React.ComponentType<React.ComponentProps<C>>, ForwardedProps extends keyof React.ComponentProps<C> & string = keyof React.ComponentProps<C> & string>(
    component: C,
    options: FilteringStyledOptions<React.ComponentProps<C>, ForwardedProps>,
  ): CreateStyledComponent<Pick<PropsOf<C>, ForwardedProps> & {theme?: Theme}>;
  <C extends React.ComponentType<React.ComponentProps<C>>>(component: C, options?: StyledOptions<React.ComponentProps<C>>): CreateStyledComponent<PropsOf<C> & {theme?: Theme}>;
  <Tag extends keyof IntrinsicElements, ForwardedProps extends keyof IntrinsicElements[Tag] & string = keyof IntrinsicElements[Tag] & string>(
    tag: Tag,
    options: FilteringStyledOptions<IntrinsicElements[Tag], ForwardedProps>,
  ): CreateStyledComponent<{theme?: Theme; as?: React.ElementType}, Pick<IntrinsicElements[Tag], ForwardedProps>>;
  <Tag extends keyof IntrinsicElements>(tag: Tag, options?: StyledOptions<IntrinsicElements[Tag]>): CreateStyledComponent<{theme?: Theme; as?: React.ElementType}, IntrinsicElements[Tag]>;
}

export type ElementType = React.ElementType & {
  defaultProps?: Partial<any>;
  __emotion_real?: ElementType;
  __emotion_base?: ElementType;
  __emotion_styles?: Interpolation<Theme>[];
  __emotion_forwardProp?: (propName: string) => boolean;
};
