import { Children, isValidElement } from "react";

interface StepProps {
  title: string;
  children: React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Step(props: StepProps) {
  return null;
}

export function Steps({ children }: { children: React.ReactNode }) {
  const steps = Children.toArray(children).filter(isValidElement);

  return (
    <div className="flex flex-col gap-6">
      {steps.map((child, i) => {
        const { title, children: desc } = child.props as StepProps;
        return (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-9 h-9 rounded-full bg-primary text-card flex items-center justify-center font-bold text-sm shrink-0">
              {i + 1}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1 mt-0">
                {title}
              </h3>
              <div className="text-[15px] leading-[1.7] text-body">
                {desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
