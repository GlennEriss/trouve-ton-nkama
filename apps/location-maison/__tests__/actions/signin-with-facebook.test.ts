import { signIn } from "@/next-auth/auth";
import { signInWithFacebook } from "@/actions/signin-with-facebook";

jest.mock("@/next-auth/auth", () => ({
  signIn: jest.fn()
}));

describe("signInWithFacebook", () => {
  it("should call signIn with 'facebook' provider", async () => {
    await signInWithFacebook();
    expect(signIn).toHaveBeenCalledWith("facebook");
  });

  it("should resolve when signIn succeeds", async () => {
    const mockResponse = { ok: true };
    (signIn as jest.Mock).mockResolvedValueOnce(mockResponse);

    await expect(signInWithFacebook()).resolves.toEqual(mockResponse);
  });

  it("should reject when signIn fails", async () => {
    const error = new Error("Facebook sign-in failed");
    (signIn as jest.Mock).mockRejectedValueOnce(error);

    await expect(signInWithFacebook()).rejects.toThrow("Facebook sign-in failed");
  });
});
