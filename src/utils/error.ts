import { ToastError } from "./toast";

export const UnauthorizedError = () => {
  ToastError("Unauthorized");
  return;
};

export function handleError(res: ApiError) {
  console.log(res, "test");

  if (res?.error && typeof res?.error !== "string") {
    res.error.forEach((obj) => {
      const arrOfError = Object.values(obj.constraints);
      arrOfError.forEach((error) => {
        ToastError(error);
      });
    });
  } else if (res?.message) {
    ToastError(res.message);
  } else {
    ToastError("Unknown error, please contact IT");
  }
}
