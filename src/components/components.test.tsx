import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { Markdown } from "./Markdown";
import { ProofReceipt } from "./ProofReceipt";

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
