import * as React from "react";
import Autosuggest, {
  type ChangeEvent,
  type RenderInputComponentProps,
  type RenderSuggestionParams,
} from "vreact-autosuggest";
type Item = { title: string; url: string };
const suggestions: Item[] = [{ title: "Navigation", url: "/navigation" }];
const ref = React.createRef<Autosuggest<Item>>();
const renderSuggestion = (item: Item, info: RenderSuggestionParams) => (
  <span data-highlighted={info.isHighlighted}>
    {item.title}
    {info.query}
  </span>
);
const renderInput = (props: RenderInputComponentProps) => <input {...props} />;
const onChange = (_event: React.FormEvent<HTMLElement>, data: ChangeEvent) => {
  const text: string = data.newValue;
  void text;
};
const widget = (
  <Autosuggest<Item>
    ref={ref}
    suggestions={suggestions}
    inputProps={{ value: "nav", onChange }}
    getSuggestionValue={(x) => x.title}
    renderSuggestion={renderSuggestion}
    renderInputComponent={renderInput}
    onSuggestionsFetchRequested={(p) => {
      const value: string = p.value;
      void value;
    }}
    onSuggestionsClearRequested={() => {}}
    onSuggestionSelected={(_e, data) => {
      const item: Item = data.suggestion;
      void item;
    }}
    renderSuggestionsContainer={({ containerProps, children }) => (
      <div {...containerProps}>{children}</div>
    )}
  />
);
ref.current?.input?.focus();
const grouped = (
  <Autosuggest<Item, { items: Item[] }>
    multiSection
    suggestions={[{ items: suggestions }]}
    getSectionSuggestions={(x) => x.items}
    renderSectionTitle={() => null}
    inputProps={{ value: "", onChange }}
    getSuggestionValue={(x) => x.title}
    renderSuggestion={renderSuggestion}
    onSuggestionsFetchRequested={() => {}}
  />
);
const invalid: import("vreact-autosuggest").InputProps<Item> = {
  // @ts-expect-error controlled inputs require a string
  value: 12,
  onChange,
};
void [widget, grouped, invalid];
