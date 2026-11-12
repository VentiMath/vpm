import { z, type ZodType, type input, type output, ZodError } from "vzod";
import { zodResolver } from "vhookform-resolvers/zod";
import { useForm } from "vreact-hook-form";
const event = z.object({
  id: z.string(),
  title: z.string().nonempty(),
  allDay: z.boolean().optional(),
  props: z.object({ label: z.string().optional() }).optional(),
});
type Event = z.infer<typeof event>;
const valid: Event = { id: "1", title: "Title" };
// @ts-expect-error required fields remain required
const missing: Event = { title: "Title" };
// @ts-expect-error nested values preserve their types
const wrong: Event = { id: "1", title: "Title", props: { label: 3 } };
const transformed = z.object({
  count: z.string().transform(Number),
  enabled: z.boolean().default(true),
});
const inValue: input<typeof transformed> = { count: "3" };
const outValue: output<typeof transformed> = { count: 3, enabled: true };
// @ts-expect-error transformed count is numeric
const invalidOutput: output<typeof transformed> = { count: "3", enabled: true };
const variant = z.union([
  z.object({ type: z.literal("text"), value: z.string() }),
  z.object({ type: z.literal("number"), value: z.number() }),
]);
const decoded = variant.parse({});
if (decoded.type === "text") decoded.value.toUpperCase();
else decoded.value.toFixed();
type Tree = { text: string; children?: Tree[] };
const tree: ZodType<Tree> = z.lazy(() =>
  z.object({ text: z.string(), children: z.array(tree).optional() }),
);
const anySchema: z.ZodTypeAny = tree;
void anySchema;
const extended = event.extend({ id: z.string().optional() });
const draft: z.infer<typeof extended> = { title: "Draft" };
z.enum(["a", "b"] as const, { required_error: "Required" }).parse("a");
const record = z.record(z.unknown());
record.parse({ a: 1 });
z.record(z.string(), z.number()).parse({ a: 1 });
const error: ZodError = new ZodError([]);
error.flatten().formErrors.map((v) => v.toUpperCase());
function Forms() {
  const f = useForm<
    input<typeof transformed>,
    unknown,
    output<typeof transformed>
  >({ resolver: zodResolver(transformed) });
  f.handleSubmit((value) => value.count.toFixed());
  // @ts-expect-error form field input is the pre-transform string
  f.setValue("count", 3);
  return null;
}
void [valid, missing, wrong, inValue, outValue, invalidOutput, draft, Forms];
