import type { ChangeEvent } from "react";

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

export function RequirementForm({
  value,
  disabled,
  onChange,
  onGenerateQuestions,
}: RequirementFormProps) {
  const rawLengthWarning =
    value.rawRequirement.trim().length > 0 && value.rawRequirement.trim().length < 10;

  return (
    <section className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-soft backdrop-blur">
      <div className="mb-5 flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-ink">需求输入</h2>
        <p className="text-sm leading-6 text-ink/65">
          把你现在能说清楚的内容都先放进来。信息不完整没关系，下一步会由 AI 来追问关键缺口。
        </p>
      </div>

      <div className="grid gap-4">
        {fieldMeta.map((field) => (
          <label key={field.key} className="grid gap-2">
            <span className="text-sm font-medium text-ink">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            <textarea
              rows={field.rows}
              value={value[field.key]}
              onChange={(event) => onChange(updateField(value, field.key, event))}
              placeholder={field.placeholder}
              className="resize-y rounded-2xl border border-black/10 bg-paper/60 px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
            />
          </label>
        ))}

        {rawLengthWarning ? (
          <div className="rounded-2xl border border-amberline/20 bg-amberline/10 px-4 py-3 text-sm leading-6 text-ink">
            当前原始需求比较短，AI 仍然可以继续生成澄清问题，但最终质量可能会依赖后续补充回答。
          </div>
        ) : null}

        <button
          type="button"
          onClick={onGenerateQuestions}
          disabled={disabled || !value.rawRequirement.trim()}
          className="rounded-full border border-ink bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          生成澄清问题
        </button>
      </div>
    </section>
  );
}
