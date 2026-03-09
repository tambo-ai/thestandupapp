"use client";

export function ConnectionPrompt({
  onOpenModal,
}: {
  onOpenModal: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <p className="text-[14px] text-[#888]">
        Connect your GitHub and Linear accounts to get started
      </p>
      <button
        onClick={onOpenModal}
        className="px-4 py-2 text-[13px] font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-[#333] transition-colors cursor-pointer"
      >
        Connect accounts
      </button>
    </div>
  );
}
