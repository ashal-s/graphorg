import {
  wouldCreateManagerCycle,
  type ManagerChain,
} from "@/lib/api/manager-chain";

/**
 * Pure-function tests for the manager-cycle check the people PATCH route
 * uses to reject a `managerId` update that would make someone their own
 * manager, directly or transitively (WEB-136's tenant-isolation-and-
 * validation requirement, the same class of bug WEB-132 fixed for service
 * dependencies). No database: `loadManagerChain`'s query is exercised
 * manually against a live Postgres instance, same boundary as
 * tests/unit/db/schema.test.ts.
 */
describe("wouldCreateManagerCycle", () => {
  it("flags a person managing themselves directly", () => {
    const chain: ManagerChain = new Map();
    expect(wouldCreateManagerCycle(chain, "alice", "alice")).toBe(true);
  });

  it("flags a manager who is already managed by this person", () => {
    // bob's manager is alice; making alice's manager bob would loop.
    const chain: ManagerChain = new Map([["bob", "alice"]]);
    expect(wouldCreateManagerCycle(chain, "alice", "bob")).toBe(true);
  });

  it("flags a transitive cycle several hops up the chain", () => {
    // carol -> bob -> alice: carol already (transitively) reports to alice.
    const chain: ManagerChain = new Map([
      ["carol", "bob"],
      ["bob", "alice"],
    ]);
    expect(wouldCreateManagerCycle(chain, "alice", "carol")).toBe(true);
  });

  it("allows a manager with no path back to this person", () => {
    const chain: ManagerChain = new Map([["dave", "eve"]]);
    expect(wouldCreateManagerCycle(chain, "alice", "dave")).toBe(false);
  });

  it("does not loop forever on an unrelated cycle already in the chain", () => {
    const chain: ManagerChain = new Map([
      ["x", "y"],
      ["y", "x"],
    ]);
    expect(wouldCreateManagerCycle(chain, "alice", "x")).toBe(false);
  });
});
