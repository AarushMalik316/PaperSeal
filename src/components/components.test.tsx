import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { Markdown } from "./Markdown";
import { ProofReceipt } from "./ProofReceipt";
import { CopyButton } from "./ui";

const HEADINGS = [
  "The user and their one task.",
  "On the blockchain.",
  "Only on the page.",
  "What the contract refuses.",
  "How to run the demo.",
  "Path to real life.",
];

describe("PROJECT_NOTE.md", () => {
  it("renders the six required headings in order", () => {
    render(<Markdown source={readFileSync("PROJECT_NOTE.md", "utf8")} />);
    const found = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(found).toEqual(HEADINGS);
  });
});

describe("ProofReceipt", () => {
  it("renders only the supplied confirmed fields", () => {
    render(
      <ProofReceipt
        receipt={{
          action: "Issue certificate (v1)",
          certId: "CERT-2026-SYN-001",
          txHash: "0x" + "ab".repeat(32),
          from: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          blockNumber: 12,
          timestamp: 1_780_000_000,
          version: 1,
          network: "Base Sepolia · 84532",
        }}
      />,
    );
    expect(screen.getByText("CERT-2026-SYN-001")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Base Sepolia · 84532")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View on BaseScan/ })).toHaveAttribute("href", `https://sepolia.basescan.org/tx/0x${"ab".repeat(32)}`);
  });
});

describe("CopyButton", () => {
  it("falls back to execCommand when navigator.clipboard rejects", async () => {
    const writeMock = vi.fn().mockRejectedValue(new Error("Clipboard blocked"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText: writeMock }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(true);

    render(<CopyButton value="PaperSeal receipt text" label="Copy receipt" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy receipt" }));

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Copied"));
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("shows a selectable textarea if all clipboard APIs fail", async () => {
    const writeMock = vi.fn().mockRejectedValue(new Error("Clipboard blocked"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText: writeMock }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(false);

    render(<CopyButton value="PaperSeal receipt text" label="Copy receipt" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy receipt" }));

    await waitFor(() => expect(screen.getByLabelText("Manual copy text")).toHaveValue("PaperSeal receipt text"));
  });
});
