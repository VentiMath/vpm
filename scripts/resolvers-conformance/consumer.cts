import { z } from "zod";
import { z as z3 } from "zod-app";
import { useForm as upstreamForm } from "react-hook-form";
import { useForm, type Resolver } from "vreact-hook-form";
import { zodResolver } from "vhookform-resolvers/zod";
import { toNestErrors } from "vhookform-resolvers";
const modern = z.object({ count: z.string().transform(Number) });
const legacy = z3.object({ count: z3.string().transform(Number) });
const compatible: Resolver<{ count: string }, unknown, { count: number }> =
  zodResolver(modern);
void compatible;
function Forms() {
  const a = useForm<{ count: string }, unknown, { count: number }>({
    resolver: zodResolver(modern),
  });
  const b = upstreamForm<{ count: string }, unknown, { count: number }>({
    resolver: zodResolver(legacy),
  });
  a.handleSubmit((v) => v.count.toFixed());
  b.handleSubmit((v) => v.count.toFixed());
  const raw = upstreamForm<{ count: string }>({
    resolver: zodResolver(modern, undefined, { raw: true, mode: "sync" }),
  });
  raw.handleSubmit((v) => v.count.toUpperCase());
  // @ts-expect-error transformed output is numeric
  a.handleSubmit((v) => v.count.toUpperCase());
  // @ts-expect-error only documented modes
  zodResolver(modern, undefined, { mode: "fast" });
  // @ts-expect-error schema parse options retain their actual Zod types
  zodResolver(modern, { inventedOption: true });
  // @ts-expect-error schema input must match the form
  useForm<{ count: boolean }>({ resolver: zodResolver(modern) });
  zodResolver(legacy, { errorMap: (issue) => ({ message: issue.code }) });
  zodResolver(modern, { error: (issue) => issue.code });
  const errors = toNestErrors<{ count: string }>(
    { count: { type: "required", message: "Required" } },
    { fields: {} },
  );
  errors.count?.message?.toUpperCase();
  return null;
}
void Forms;
