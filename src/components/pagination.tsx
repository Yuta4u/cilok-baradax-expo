import { AntDesign } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type PaginationProps = {
  metadata: Metadata;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  metadata,
  onPageChange,
}: PaginationProps) {
  const { page, totalPages } = metadata;

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        justifyContent: "center",
        marginTop: 10,
      }}
    >
      <TouchableOpacity
        onPress={() => !isFirstPage && onPageChange(page - 1)}
        disabled={isFirstPage}
        style={{
          opacity: isFirstPage ? 0.5 : 1,
          backgroundColor: "#F8B259",
          padding: 4,
          borderRadius: 4,
        }}
      >
        <AntDesign name="left" size={17} color="white" />
      </TouchableOpacity>

      <Text style={{ color: "white", fontSize: 13 }}>
        {!totalPages ? 0 : page} / {!totalPages ? 0 : totalPages}
      </Text>

      <TouchableOpacity
        onPress={() => !isLastPage && onPageChange(page + 1)}
        disabled={isLastPage}
        style={{
          opacity: isLastPage ? 0.5 : 1,
          backgroundColor: "#F8B259",
          padding: 4,
          borderRadius: 4,
        }}
      >
        <AntDesign name="right" size={17} color="white" />
      </TouchableOpacity>
    </View>
  );
}
