"use client";

import { useState } from "react";
import type { GenerateRequest, PresetInput } from "@/lib/types";

interface InputFormProps {
  onSubmit: (data: GenerateRequest) => void;
  isLoading?: boolean;
}

const PRESET_EXAMPLES: PresetInput[] = [
  {
    name: "Coaching",
    description: "Why coaches fail on Instagram",
    data: {
      topic: "Why coaches fail on Instagram",
      niche: "Business coaching",
      audience: "New coaches under 10k followers",
      tone: "Direct",
      goal: "Engagement",
      slideCount: 5,
    },
  },
  {
    name: "Ecommerce",
    description: "3 mistakes ecommerce brands make",
    data: {
      topic: "3 mistakes ecommerce brands make with content",
      niche: "Ecommerce education",
      audience: "Brand owners",
      tone: "Educational",
      goal: "Lead generation",
      slideCount: 6,
    },
  },
  {
    name: "Creator Monetization",
    description: "How to turn followers into clients",
    data: {
      topic: "How to turn followers into clients",
      niche: "Creator monetization",
      audience: "Course creators",
      tone: "Confident",
      goal: "Conversion",
      slideCount: 5,
    },
  },
];

export default function InputForm({ onSubmit, isLoading = false }: InputFormProps) {
  const [formData, setFormData] = useState<GenerateRequest>({
    topic: "",
    niche: "",
    audience: "",
    tone: "Educational",
    goal: "Engagement",
    slideCount: 5,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "slideCount" ? parseInt(value) : value,
    }));
  };

  const handlePreset = (preset: PresetInput) => {
    setFormData(preset.data);
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
  const labelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-500";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.topic.trim() ||
      !formData.niche.trim() ||
      !formData.audience.trim() ||
      formData.slideCount < 3 ||
      formData.slideCount > 10
    ) {
      alert("Please fill in all fields. Slides must be between 3 and 10.");
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-7 shadow-soft backdrop-blur-sm sm:p-8">
      <div className="mb-7 border-b border-slate-100 pb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Brief</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          We&apos;ll generate both paths from the same inputs.
        </p>
      </div>

      <div className="mb-7">
        <p className={labelClass}>Quick start</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {PRESET_EXAMPLES.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handlePreset(preset)}
              disabled={isLoading}
              title={preset.description}
              className="rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/80 hover:text-indigo-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {[
          { label: "Topic", name: "topic", placeholder: "e.g., Why coaches fail on Instagram" },
          { label: "Niche", name: "niche", placeholder: "e.g., Business coaching" },
          {
            label: "Target audience",
            name: "audience",
            placeholder: "e.g., New coaches under 10k followers",
          },
        ].map((field) => (
          <div key={field.name}>
            <label className={labelClass}>
              {field.label} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name as keyof GenerateRequest] as string}
              onChange={handleChange}
              disabled={isLoading}
              className={inputClass}
            />
          </div>
        ))}

        <div>
          <label className={labelClass}>
            Tone <span className="text-rose-500">*</span>
          </label>
          <select
            name="tone"
            value={formData.tone}
            onChange={handleChange}
            disabled={isLoading}
            className={inputClass}
          >
            <option>Direct</option>
            <option>Educational</option>
            <option>Confident</option>
            <option>Casual</option>
            <option>Professional</option>
            <option>Inspirational</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Content goal <span className="text-rose-500">*</span>
          </label>
          <select
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            disabled={isLoading}
            className={inputClass}
          >
            <option>Engagement</option>
            <option>Lead generation</option>
            <option>Conversion</option>
            <option>Education</option>
            <option>Entertainment</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Slides (3–10) <span className="text-rose-500">*</span>
          </label>
          <select
            name="slideCount"
            value={formData.slideCount}
            onChange={handleChange}
            disabled={isLoading}
            className={inputClass}
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} slides
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="group relative mt-4 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span className="relative z-10">{isLoading ? "Generating…" : "Compare generation methods"}</span>
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition group-hover:opacity-100 group-hover:duration-500"
          />
        </button>
      </form>
    </div>
  );
}
