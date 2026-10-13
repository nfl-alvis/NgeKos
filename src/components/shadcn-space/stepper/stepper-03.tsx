"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface StepItem {
  title: string;
  icon: LucideIcon;
  content?: string | React.ReactNode;
  description?: string;
}

const defaultSteps: StepItem[] = [
  { title: "Account", icon: User, content: "Account details are here" },
  { title: "Profile", icon: Settings, content: "Profile settings are here" },
  { title: "Upload", icon: Upload, content: "Upload your files here" },
  { title: "Done", icon: Home, content: "Everything is ready" },
];

export interface Stepper03Props {
  steps?: StepItem[];
  activeStep?: number;
  onStepChange?: (index: number) => void;
  canNavigateStep?: (index: number) => boolean;
  className?: string;
  showContent?: boolean;
  showNavigation?: boolean;
}

export default function Stepper03({
  steps = defaultSteps,
  activeStep: controlledActiveStep,
  onStepChange,
  canNavigateStep,
  className,
  showContent = true,
  showNavigation = true,
}: Stepper03Props) {
  const [internalActiveStep, setInternalActiveStep] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const isControlled = typeof controlledActiveStep === "number";
  const activeStep = isControlled ? controlledActiveStep : internalActiveStep;

  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? Math.min(Math.max(activeStep / (totalSteps - 1), 0), 1) : 0;

  // Calculate dynamic line and ball positions based on step count
  const stepOffset = 100 / (totalSteps * 2);
  const totalSpan = 100 - stepOffset * 2;

  const handleStepClick = (index: number) => {
    if (canNavigateStep && !canNavigateStep(index)) return;
    if (onStepChange) {
      onStepChange(index);
    } else {
      setInternalActiveStep(index);
    }
  };

  const handleNext = () => {
    if (activeStep < totalSteps - 1) {
      const nextIndex = activeStep + 1;
      if (canNavigateStep && !canNavigateStep(nextIndex)) return;
      if (onStepChange) {
        onStepChange(nextIndex);
      } else {
        setInternalActiveStep(nextIndex);
      }
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      const prevIndex = activeStep - 1;
      if (canNavigateStep && !canNavigateStep(prevIndex)) return;
      if (onStepChange) {
        onStepChange(prevIndex);
      } else {
        setInternalActiveStep(prevIndex);
      }
    }
  };

  return (
    <div className={cn("mx-auto w-full", className)}>
      <div
        className={cn(
          "rounded-xl border border-nk-border bg-nk-surface p-4 sm:p-6 md:p-8 flex flex-col shadow-sm transition-all",
          showContent || showNavigation ? "gap-8" : "gap-0"
        )}
      >
        <div className="relative">
          {/* Background Track Line */}
          <div
            className="absolute top-5 h-0.5 bg-nk-border"
            style={{ left: `${stepOffset}%`, right: `${stepOffset}%` }}
          />
          {/* Animated Filled Progress Line */}
          <motion.div
            className="absolute top-5 h-0.5 bg-primary origin-left"
            style={{ left: `${stepOffset}%`, right: `${stepOffset}%` }}
            initial={false}
            animate={{ scaleX: progress }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          {/* Moving Indicator Dot */}
          <motion.span
            className="absolute size-2 rounded-full bg-primary"
            style={{ top: 20, x: "-50%", y: "-50%" }}
            initial={{ left: `${stepOffset}%` }}
            animate={{ left: `${stepOffset + progress * totalSpan}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
          />
          {/* Step Nodes */}
          <div className="relative flex items-start justify-between">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;
              const isAllowed = canNavigateStep ? canNavigateStep(index) : true;

              return (
                <div
                  key={step.title}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={!isAllowed}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`${step.title} step`}
                    className={cn(
                      "group relative z-10 flex size-10 items-center justify-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isAllowed ? "cursor-pointer" : "cursor-default opacity-80"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 rounded-full transition-colors duration-300",
                        isCompleted || isActive
                          ? "bg-primary"
                          : "bg-nk-warm group-hover:bg-nk-border/60"
                      )}
                    />
                    {isActive && !prefersReducedMotion && (
                      <motion.span
                        className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{
                          scale: [1, 1.45, 1],
                          opacity: [1, 0.2, 1],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          repeatType: "mirror",
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <motion.div
                      className="relative flex items-center justify-center"
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 18,
                      }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {isCompleted ? (
                          <motion.span
                            key="check"
                            initial={{ scale: 0, rotate: -90, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 0, rotate: 90, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 22,
                            }}
                            className="flex items-center justify-center text-white"
                          >
                            <Check className="size-5" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="icon"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 22,
                            }}
                            className="flex items-center justify-center"
                          >
                            <step.icon
                              className={cn(
                                "size-5",
                                isActive
                                  ? "text-primary-foreground"
                                  : "text-nk-text-muted"
                              )}
                            />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </button>
                  <span
                    className={cn(
                      "text-[11px] sm:text-xs font-medium text-center transition-colors duration-300 max-w-[90px] sm:max-w-none leading-tight",
                      isActive
                        ? "text-nk-text font-bold"
                        : isCompleted
                          ? "text-nk-text font-medium"
                          : "text-nk-text-muted"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {showContent && (
          <div className="min-h-20 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-1"
              >
                <p className="text-lg font-semibold text-foreground">
                  {typeof steps[activeStep]?.content === "string" ? (
                    steps[activeStep].content
                  ) : (
                    <>{steps[activeStep]?.title} content</>
                  )}
                </p>
                {steps[activeStep]?.description && (
                  <p className="text-sm text-muted-foreground">
                    {steps[activeStep].description}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {showNavigation && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={activeStep === 0}
                className="cursor-pointer"
              >
                <ChevronLeft />
                Back
              </Button>
              <p className="text-sm text-muted-foreground">
                Step {activeStep + 1} of {steps.length}
              </p>
              <Button
                onClick={handleNext}
                disabled={activeStep === steps.length - 1}
                className="cursor-pointer"
              >
                Continue
                <ChevronRight />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
