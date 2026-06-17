import mongoose from "mongoose";

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, index: true },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Theatre = mongoose.model("Theatre", theatreSchema);
export default Theatre;
