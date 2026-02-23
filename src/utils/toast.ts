import Toast from "react-native-toast-message";

const ToastSuccess = (message: string) => {
  Toast.show({
    type: "success",
    text1: "Successfully!",
    text2: message,
    visibilityTime: 2000,
  });
};

const ToastError = (message: string) => {
  Toast.show({
    type: "error",
    text1: "Error!",
    text2: message,
  });
};

export { ToastSuccess, ToastError };
