import mongoose from "mongoose";

const sidebarSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Sidebar title is required"],
            trim: true,
        },
        route: {
            type: String,
            required: [true, "Sidebar route is required"],
            trim: true,
            unique: true,
        },
        icon: {
            type: String,
            required: [true, "Sidebar icon is required"],
            trim: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sidebar",
            default: null,
        },
        order: {
            type: Number,
            required: true,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        /** Used by frontend role/module filtering; derived from route when omitted. */
        slug: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

sidebarSchema.index({ isActive: 1, order: 1 });
sidebarSchema.index({ parentId: 1, order: 1 });

export const Sidebar =
    mongoose.models.Sidebar || mongoose.model("Sidebar", sidebarSchema);
