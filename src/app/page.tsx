"use client";

import { useState } from "react";
import type { GenerateRequest, GenerateResponse } from "@/lib/types";
import Header from "@/components/Header";
import InputForm from "@/components/InputForm";
import ComparisonView from "@/components/ComparisonView";
import LoadingState from "@/components/LoadingState";
import ErrorMessage from "@/components/ErrorMessage";
import PipelineLog from "@/components/PipelineLog";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const handleGenerate = async (formData: GenerateRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(5);
    setCurrentStep("Initializing generation...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to generate carousel");
      }

      if (!response.body) {
        throw new Error("Streamed response not available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: GenerateResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);

          const lines = chunk.split("\n");
          let event = "message";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              event = line.replace("event:", "").trim();
            }
            if (line.startsWith("data:")) {
              eventData += line.replace("data:", "").trim();
            }
          }

          try {
            const parsed = eventData ? JSON.parse(eventData) : null;

            if (event === "progress" && parsed) {
              setCurrentStep(parsed.stage || "Processing...");
              setProgress(typeof parsed.value === "number" ? parsed.value : progress + 1);
            }

            if (event === "log" && parsed) {
              setCurrentStep(parsed.message || currentStep);
            }

            if (event === "done" && parsed) {
              finalResult = parsed as GenerateResponse;
            }

            if (event === "error" && parsed) {
              throw new Error(parsed.message || "Pipeline error");
            }
          } catch (parseErr) {
            // ignore parse error from partial lines
          }

          boundary = buffer.indexOf("\n\n");
        }
      }

      if (!finalResult) {
        throw new Error("No final data received");
      }

      setResult(finalResult);
      setCurrentStep("Generation complete");
      setProgress(100);

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setCurrentStep("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setResult(null);
    setCurrentStep("");
    setProgress(0);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-app-mesh">
      <Header />

      <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14 xl:px-14">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12 xl:gap-16">
          {/* Left: Form */}
          <div className="flex justify-center lg:col-span-1 lg:justify-start">
            <div className="sticky top-8 z-10 w-full max-w-md lg:max-w-none">
              <InputForm onSubmit={handleGenerate} isLoading={isLoading} />
            </div>
          </div>

          {/* Right: Results */}
          <div className="flex min-h-0 flex-col lg:col-span-2">
            {isLoading && (
              <div className="mb-8 lg:mb-10">
                <LoadingState currentStep={currentStep} progress={progress} />
              </div>
            )}

            {error && (
              <div className="mb-8">
                <ErrorMessage message={error} onRetry={handleRetry} />
              </div>
            )}

            {result && (
              <div id="results" className="space-y-10 lg:space-y-12">
                <ComparisonView
                  singlePromptResult={result.singlePromptResult}
                  pipelineResult={result.pipelineResult}
                  judgeResult={result.judgeResult}
                />

                <PipelineLog logs={result.logs} />
              </div>
            )}

            {!isLoading && !error && !result && (
              <div className="flex flex-1 flex-col items-center justify-center py-10 lg:min-h-[min(32rem,calc(100dvh-14rem))] lg:py-12">
                <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 px-8 py-12 text-center shadow-soft backdrop-blur-sm sm:px-12 sm:py-14">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl"
                  />
                  <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </div>
                  <h2 className="relative text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                    Ready when you are
                  </h2>
                  <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
                    Fill in the brief on the left, then run{" "}
                    <span className="font-medium text-slate-800">Compare Generation Methods</span> to see
                    single-shot vs pipeline side by side—with rubric scores and an optional comparative judge.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-auto border-t border-slate-200/80 bg-white/60 py-8 backdrop-blur-sm sm:py-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 xl:px-14">
          <p className="text-center text-sm leading-relaxed text-slate-500">
            Built to demonstrate AI pipeline design and content generation workflows
          </p>
        </div>
      </footer>
    </main>
  );
}
