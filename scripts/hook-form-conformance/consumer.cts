import { createElement } from "react";
import {
  useForm,
  Controller,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
  type UseFormWatch,
  type DeepPartial,
  type Resolver,
} from "vreact-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
type Data = {
  name: string;
  agree: boolean;
  event: { title: string };
  tags: string[];
};
const schema = z.object({
  name: z.string(),
  agree: z.boolean(),
  event: z.object({ title: z.string() }),
  tags: z.array(z.string()),
});
function Form() {
  const f = useForm<Data>({
    defaultValues: { name: "", agree: false, event: { title: "" }, tags: [] },
    mode: "onChange",
    resolver: zodResolver(schema),
  });
  const control: Control<Data> = f.control;
  const errors: FieldErrors<Data> = f.formState.errors;
  const setValue: UseFormSetValue<Data> = f.setValue;
  const watch: UseFormWatch<Data> = f.watch;
  setValue("event.title", "Title");
  setValue("tags.0", "math");
  const text: string = watch("event.title");
  void text;
  void errors;
  f.trigger(["name", "agree"]);
  f.reset({ name: "new" });
  f.handleSubmit(async (values) => {
    values.event.title.toUpperCase();
  });
  // @ts-expect-error names are checked against the form
  f.setValue("missing", "x");
  // @ts-expect-error values preserve the field type
  f.setValue("agree", "yes");
  return createElement(Controller<Data, "name">, {
    name: "name",
    control,
    render: ({ field }) => createElement("input", field),
  });
}
const partial: DeepPartial<Data> = { event: {} };
void partial;
void Form;
const transform: Resolver<{ name: string }, unknown, { length: number }> = (
  v,
) => ({ values: { length: v.name.length }, errors: {} });
function Transformed() {
  const f = useForm<{ name: string }, unknown, { length: number }>({
    resolver: transform,
  });
  f.handleSubmit((v) => v.length.toFixed());
  return null;
}
void Transformed;
