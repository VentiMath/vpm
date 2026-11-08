import * as React from "react";
declare class Autosuggest<T = unknown, S = unknown> extends React.Component<
  Autosuggest.AutosuggestProps<T, S>
> {
  input: HTMLInputElement | undefined;
}
declare namespace Autosuggest {
  type FetchRequestedReasons =
    | "input-changed"
    | "input-focused"
    | "escape-pressed"
    | "suggestions-revealed"
    | "suggestion-selected";
  type ShouldRenderReasons =
    | FetchRequestedReasons
    | "input-blurred"
    | "suggestions-updated"
    | "render";
  interface ChangeEvent {
    newValue: string;
    method: "type" | "up" | "down" | "escape" | "enter" | "click";
  }
  interface BlurEvent<T> {
    highlightedSuggestion: T | null;
  }
  interface RenderSuggestionParams {
    query: string;
    isHighlighted: boolean;
  }
  interface SuggestionsFetchRequestedParams {
    value: string;
    reason: FetchRequestedReasons;
  }
  interface SuggestionSelectedEventData<T> {
    suggestion: T;
    suggestionValue: string;
    suggestionIndex: number;
    sectionIndex: number | null;
    method: "click" | "enter";
  }
  interface SuggestionHighlightedParams<T = unknown> {
    suggestion: T | null;
  }
  interface InputProps<T>
    extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "onChange" | "onBlur"
    > {
    value: string;
    onChange: (
      event: React.FormEvent<HTMLInputElement>,
      data: ChangeEvent,
    ) => void;
    onBlur?: (
      event: React.FocusEvent<HTMLInputElement>,
      data: BlurEvent<T>,
    ) => void;
    ref?: React.Ref<HTMLInputElement>;
  }
  interface RenderInputComponentProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    ref?: React.Ref<HTMLInputElement>;
  }
  type ThemeKey =
    | "container"
    | "containerOpen"
    | "input"
    | "inputOpen"
    | "inputFocused"
    | "suggestionsContainer"
    | "suggestionsContainerOpen"
    | "suggestionsList"
    | "suggestion"
    | "suggestionFirst"
    | "suggestionHighlighted"
    | "sectionContainer"
    | "sectionContainerFirst"
    | "sectionTitle";
  type Theme = Partial<Record<ThemeKey, string | React.CSSProperties>>;
  interface RenderSuggestionsContainerParams {
    containerProps: React.HTMLAttributes<HTMLDivElement> & {
      id: string;
      key: React.Key;
      ref: React.Ref<HTMLDivElement>;
    };
    children: React.ReactNode;
    query: string;
  }
  interface AutosuggestPropsBase<T> {
    id?: string;
    inputProps: InputProps<T>;
    containerProps?: React.HTMLAttributes<HTMLDivElement>;
    alwaysRenderSuggestions?: boolean;
    highlightFirstSuggestion?: boolean;
    focusInputOnSuggestionClick?: boolean;
    getSuggestionValue: (suggestion: T) => string;
    renderSuggestion: (
      suggestion: T,
      params: RenderSuggestionParams,
    ) => React.ReactNode;
    onSuggestionsFetchRequested: (
      params: SuggestionsFetchRequestedParams,
    ) => void;
    onSuggestionsClearRequested?: () => void;
    onSuggestionSelected?: (
      event: React.SyntheticEvent,
      data: SuggestionSelectedEventData<T>,
    ) => void;
    onSuggestionHighlighted?: (params: SuggestionHighlightedParams<T>) => void;
    shouldRenderSuggestions?: (
      value: string,
      reason: ShouldRenderReasons,
    ) => boolean;
    shouldKeepSuggestionsOnSelect?: (suggestion: T) => boolean;
    renderInputComponent?: (
      props: RenderInputComponentProps,
    ) => React.ReactNode;
    renderSuggestionsContainer?: (
      params: RenderSuggestionsContainerParams,
    ) => React.ReactNode;
    theme?:
      | Theme
      | readonly [Theme, (...styles: React.CSSProperties[]) => string];
  }
  type AutosuggestProps<T, S = unknown> = AutosuggestPropsBase<T> &
    (
      | { multiSection?: false; suggestions: readonly T[] }
      | {
          multiSection: true;
          suggestions: readonly S[];
          getSectionSuggestions: (section: S) => readonly T[];
          renderSectionTitle: (section: S) => React.ReactNode;
        }
    );
}
export = Autosuggest;
