import type { ChangeEvent } from "react";
import { FilePenLine, WandSparkles } from "lucide-react";

import type { RequirementInput } from "../types/app";

type RequirementFormProps = {
  value: RequirementInput;
  disabled?: boolean;
  onChange: (value: RequirementInput) => void;
  onGenerateQuestions: () => void;
};

function updateField(
  state: RequirementInput,
  key: keyof RequirementInput,
  event: ChangeEvent<HTMLTextAreaElement>,
) {
  return {
    ...state,
    [key]: event.target.value,
  };
}

const fieldMeta: Array<{
  key: keyof RequirementInput;
  label: string;
  placeholder: string;
  rows: number;
  required?: boolean;
}> = [
  {
    key: "rawRequirement",
    label: "原始需求",
    placeholder: "例如：我想做一个工具，让用户输入想法后，AI 先追问关键问题，再输出适合给编码 Agent 的完整需求提示词。",
    rows: 6,
    required: true,
  },
  {
    key: "projectBackground",
    label: "项目背景",
    placeholder: "补充这个项目为什么要做、当前痛点是什么。",
    rows: 4,
  },
  {
    key: "targetAudience",
    label: "目标用户",
    placeholder: "例如：普通用户、开发者、产品经理、学生等。",
    rows: 3,
  },
  {
    key: "constraints",
    label: "约束条件",
    placeholder: "例如：只做前端、默认中文、必须静态部署、不能保存 API Key。",
    rows: 4,
  },
  {
    key: "extraMaterials",
    label: "补充材料",
    placeholder: "可以填写竞品、参考流程、已有思路、注意事项等。",
    rows: 4,
  },
];

const optionalFields = fieldMeta.filter((field) => field.key !== "rawRequirement");
const primaryField = fieldMeta.find((field) => field.key === "rawRequirement")!;

export function RequirementForm({
  value,
  disabled,
  onChange,
  onGenerateQuestions,
}: RequirementFormProps) {
  const rawLengthWarning =
    value.rawRequirement.trim().length > 0 && value.rawRequirement.trim().length < 10;

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-ink/8 bg-white/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-moss text-white shadow-soft">
              <FilePenLine className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">Draft Input</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                输入你的原始想法
              </h2>
            </div>
          </div>
          <span className="hidden rounded-full border border-ink/10 bg-paper/70 px-3 py-1 text-xs font-semibold text-ink/58 sm:inline-flex">
            不完整也可以
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/62">
          这里像一张草稿纸。把你知道的先写下来，下一步 AI 会像产品访谈一样补问关键缺口。
        </p>
      </div>

      <div className="grid gap-4 p-5">
        <label key={primaryField.key} className="grid gap-2">
          <span className="text-sm font-semibold text-ink">
            {primaryField.label} *
          </span>
          <textarea
            rows={primaryField.rows}
            value={value[primaryField.key]}
            onChange={(event) => onChange(updateField(value, primaryField.key, event))}
            placeholder={primaryField.placeholder}
            className="field min-h-[220px] resize-y bg-vellum bg-paper-grid bg-[size:22px_22px] text-base leading-8"
          />
        </label>

        <details className="rounded-2xl border border-ink/8 bg-white/45">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
            补充上下文（可选）
          </summary>
          <div className="grid gap-4 border-t border-ink/8 p-4">
            {optionalFields.map((field) => (
              <label key={field.key} className="grid gap-2">
            <span className="text-sm font-semibold text-ink">
              {field.label}
            </span>
            <textarea
              rows={field.rows}
              value={value[field.key]}
              onChange={(event) => onChange(updateField(value, field.key, event))}
              placeholder={field.placeholder}
              className="field resize-y"
            />
          </label>
            ))}
          </div>
        </details>

        {rawLengthWarning ? (
          <div className="rounded-2xl border border-amberline/20 bg-amberline/10 px-4 py-3 text-sm leading-6 text-ink">
            当前原始需求比较短，AI 仍然可以继续生成澄清问题，但最终质量可能会依赖后续补充回答。
          </div>
        ) : null}

        <button
          type="button"
          onClick={onGenerateQuestions}
          disabled={disabled || !value.rawRequirement.trim()}
          className="primary-button w-full gap-2"
        >
          <WandSparkles className="h-4 w-4" />
          生成澄清问题
        </button>
      </div>
    </section>
  );
}
