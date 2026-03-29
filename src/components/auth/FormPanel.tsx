interface FormPanelProps {
  children: React.ReactNode;
}

export function FormPanel({ children }: FormPanelProps) {
  return (
    <div className="flex-1 flex flex-col md:justify-center px-6 py-10 sm:px-12 md:px-10 lg:px-16">
      <div className="w-full max-w-sm mx-auto md:max-w-none">{children}</div>
    </div>
  );
}
