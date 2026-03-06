import { useState } from "react";
import { HelpCircle, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Questionnaire } from "@/api/dosage-agent-chat";

export function QuestionnaireCard({
  questionnaire,
  onSubmit,
  disabled,
}: {
  questionnaire: Questionnaire;
  onSubmit: (answers: Record<string, string | string[]>) => void;
  disabled?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const handleSingleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultiSelect = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleTextInput = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isComplete = questionnaire.questions
    .filter((q) => q.required)
    .every((q) => {
      const answer = answers[q.id];
      return answer && (Array.isArray(answer) ? answer.length > 0 : answer.length > 0);
    });

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-sky-600 shrink-0" />
        <span className="text-sm font-medium text-slate-800">{questionnaire.title}</span>
      </div>
      {questionnaire.description && (
        <p className="text-xs text-slate-600">{questionnaire.description}</p>
      )}
      {questionnaire.questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label className="text-xs font-medium text-slate-700">
            {q.question}
            {q.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {(q.type === "single_select" || q.type === "multi_select") && q.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {q.options.map((opt) => {
                const isSelected =
                  q.type === "single_select"
                    ? answers[q.id] === opt.value
                    : ((answers[q.id] as string[]) || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      q.type === "single_select"
                        ? handleSingleSelect(q.id, opt.value)
                        : handleMultiSelect(q.id, opt.value)
                    }
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                      isSelected
                        ? "border-sky-400 bg-sky-100 text-sky-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {q.type === "multi_select" && (
                      <div
                        className={cn(
                          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                          isSelected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300",
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[10px] text-slate-500 mt-0.5">{opt.description}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {q.type === "text" && (
            <Textarea
              placeholder={q.placeholder || "Scrivi qui..."}
              value={(answers[q.id] as string) || ""}
              onChange={(e) => handleTextInput(q.id, e.target.value)}
              disabled={disabled}
              className="min-h-[60px] resize-none text-xs"
            />
          )}
        </div>
      ))}
      <Button
        size="sm"
        className="bg-sky-600 hover:bg-sky-700 text-white"
        disabled={!isComplete || disabled}
        onClick={() => onSubmit(answers)}
      >
        <Send className="h-3.5 w-3.5 mr-1.5" />
        Invia risposte
      </Button>
    </div>
  );
}
