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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {steps.map((child, i) => {
        const { title, children: desc } = child.props as StepProps;
        return (
          <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-bg-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  margin: "0 0 4px 0",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: 1.7,
                  color: "var(--color-text-body)",
                  margin: 0,
                }}
              >
                {desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
