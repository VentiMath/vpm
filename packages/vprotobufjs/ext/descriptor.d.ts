import * as $protobuf from "..";
import {
  IDescriptorProto,
  IEnumDescriptorProto,
  IFieldDescriptorProto,
  IFileDescriptorSet,
  IMethodDescriptorProto,
  IServiceDescriptorProto,
} from "./descriptor.generated";
export * from "./descriptor.generated";

declare module ".." {
  namespace Root {
    function fromDescriptor(
      descriptor: IFileDescriptorSet | $protobuf.Reader | Uint8Array,
      options?: { keepCase?: boolean },
    ): $protobuf.Root;
  }
  interface Root {
    toDescriptor(
      syntax?: "proto2" | "proto3",
    ): $protobuf.Message<IFileDescriptorSet> & IFileDescriptorSet;
  }
  namespace Type {
    function fromDescriptor(
      descriptor: IDescriptorProto,
      options?: { syntax?: "proto2" | "proto3"; keepCase?: boolean },
    ): $protobuf.Type;
  }
  interface Type {
    toDescriptor(
      syntax?: "proto2" | "proto3",
    ): $protobuf.Message<IDescriptorProto> & IDescriptorProto;
  }
  namespace Enum {
    function fromDescriptor(descriptor: IEnumDescriptorProto): $protobuf.Enum;
  }
  interface Enum {
    toDescriptor(): $protobuf.Message<IEnumDescriptorProto> &
      IEnumDescriptorProto;
  }
  interface Field {
    toDescriptor(
      syntax?: "proto2" | "proto3",
    ): $protobuf.Message<IFieldDescriptorProto> & IFieldDescriptorProto;
  }
  interface Method {
    toDescriptor(): $protobuf.Message<IMethodDescriptorProto> &
      IMethodDescriptorProto;
  }
  interface Service {
    toDescriptor(): $protobuf.Message<IServiceDescriptorProto> &
      IServiceDescriptorProto;
  }
}
