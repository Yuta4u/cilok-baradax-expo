import { useMutation } from "@tanstack/react-query";
import { SignInApi } from "../../api/(auth)/sign-in.api";

export const useSignInMutation = () => {
  return useMutation({
    mutationFn: SignInApi,
  });
};
