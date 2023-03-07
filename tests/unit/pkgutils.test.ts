import { assert, assertEquals, assertFalse } from "deno/testing/asserts.ts"
import SemVer, { Range } from "utils/semver.ts"
import * as pkg from "utils/pkg.ts"


Deno.test("pkg.str", async test => {
  let out: string

  await test.step("precise", () => {
    out = pkg.str({
      project: "test",
      version: new SemVer("1.2.3")
    })
    assertEquals(out, "test=1.2.3")
  })

  for (const range of ["^1", "^1.2", "^1.2.3"]) {
    await test.step(range, () => {
      out = pkg.str({
        project: "test",
        constraint: new Range(range)
      })
      assertEquals(out, `test${range}`)
    })
  }

  for (const [range, expected] of [[">=1 <2", "^1"], [">=1.2 <2", "^1.2"], [">=1.2.3 <2", "^1.2.3"]]) {
    await test.step(`${range} == ${expected}`, () => {
      out = pkg.str({
        project: "test",
        constraint: new Range(range)
      })
      assertEquals(out, `test${expected}`)
    })
  }

  await test.step("range of one version", () => {
    const constraint = new Range("=1.2.3")

    out = pkg.str({
      project: "test",
      constraint
    })
    assert(constraint.single())
    assertEquals(out, `test=1.2.3`)
  })
})

Deno.test("pkg.parse", async test => {
  await test.step("@5", () => {
    const { constraint } = pkg.parse("test@5")
    assert(constraint.satisfies(new SemVer([5,0,0])))
    assert(constraint.satisfies(new SemVer([5,1,0])))
    assertFalse(constraint.satisfies(new SemVer([6,0,0])))
  })

  await test.step("@5.0", () => {
    const { constraint } = pkg.parse("test@5.0")
    assert(constraint.satisfies(new SemVer([5,0,0])))
    assert(constraint.satisfies(new SemVer([5,0,1])))
    assertFalse(constraint.satisfies(new SemVer([5,1,0])))
  })

  await test.step("@5.0.0", () => {
    const { constraint } = pkg.parse("test@5.0.0")
    assert(constraint.satisfies(new SemVer([5,0,0])))
    assert(constraint.satisfies(new SemVer([5,0,0,1])))
    assertFalse(constraint.satisfies(new SemVer([5,0,1])))
  })
})