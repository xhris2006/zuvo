// Fichier généré par `npm run db:types` à partir de supabase/migrations.
// Ne pas modifier à la main.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id?: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          buyer_id: string | null;
          created_at: string;
          id: string;
          last_message_at: string;
          listing_id: string | null;
          seller_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          buyer_id?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          listing_id?: string | null;
          seller_id?: string | null;
        };
        Update: {
          buyer_id?: string | null;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          listing_id?: string | null;
          seller_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          listing_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          listing_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          listing_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          follower_id?: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          created_at: string;
          id: string;
          listing_id: string;
          sort_order: number;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          listing_id: string;
          sort_order: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          listing_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          category_id: string | null;
          city: string | null;
          condition: Database["public"]["Enums"]["listing_condition"] | null;
          country_code: string;
          created_at: string;
          description: string;
          id: string;
          price: number | null;
          published_at: string | null;
          removed_at: string | null;
          removed_reason: string | null;
          search_vector: unknown;
          seller_id: string;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          city?: string | null;
          condition?: Database["public"]["Enums"]["listing_condition"] | null;
          country_code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          price?: number | null;
          published_at?: string | null;
          removed_at?: string | null;
          removed_reason?: string | null;
          search_vector?: never;
          seller_id?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          city?: string | null;
          condition?: Database["public"]["Enums"]["listing_condition"] | null;
          country_code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          price?: number | null;
          published_at?: string | null;
          removed_at?: string | null;
          removed_reason?: string | null;
          search_vector?: never;
          seller_id?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          attachment_path: string | null;
          body: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          sender_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          attachment_path?: string | null;
          body?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id?: string | null;
        };
        Update: {
          attachment_path?: string | null;
          body?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action_type"];
          admin_id: string | null;
          created_at: string;
          id: string;
          note: string | null;
          report_id: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        ComputedFields: never;
        Insert: {
          action: Database["public"]["Enums"]["moderation_action_type"];
          admin_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          report_id?: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        Update: {
          action?: Database["public"]["Enums"]["moderation_action_type"];
          admin_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          report_id?: string | null;
          target_id?: string;
          target_type?: Database["public"]["Enums"]["report_target_type"];
        };
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          followed_user_listing: boolean;
          listing_activity: boolean;
          new_follower: boolean;
          new_message: boolean;
          push_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          followed_user_listing?: boolean;
          listing_activity?: boolean;
          new_follower?: boolean;
          new_message?: boolean;
          push_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          followed_user_listing?: boolean;
          listing_activity?: boolean;
          new_follower?: boolean;
          new_message?: boolean;
          push_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          conversation_id: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          listing_id: string | null;
          pushed_at: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          listing_id?: string | null;
          pushed_at?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          listing_id?: string | null;
          pushed_at?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_private: {
        Row: {
          id: string;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_private_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          bio: string | null;
          city: string | null;
          country_code: string;
          created_at: string;
          display_name: string;
          id: string;
          suspended_at: string | null;
          updated_at: string;
          username: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          bio?: string | null;
          city?: string | null;
          country_code?: string;
          created_at?: string;
          display_name: string;
          id: string;
          suspended_at?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string | null;
          city?: string | null;
          country_code?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          suspended_at?: string | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_used_at: string | null;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_used_at?: string | null;
          p256dh: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_used_at?: string | null;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string | null;
          resolution_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string | null;
          resolution_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string | null;
          resolution_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id?: string;
          target_type?: Database["public"]["Enums"]["report_target_type"];
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          granted_at?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_get_reported_message: {
        Args: { p_report_id: string };
        Returns: {
          body: string;
          conversation_id: string;
          created_at: string;
          message_id: string;
          sender_id: string;
          sender_username: string;
        }[];
      };
      admin_get_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_list_reports: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_status: Database["public"]["Enums"]["report_status"];
        };
        Returns: {
          created_at: string;
          details: string;
          id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_display_name: string;
          reporter_username: string;
          resolution_note: string;
          reviewed_at: string;
          status: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
          total_count: number;
        }[];
      };
      admin_remove_listing: {
        Args: { p_listing_id: string; p_reason: string; p_report_id?: string };
        Returns: undefined;
      };
      admin_restore_listing: {
        Args: { p_listing_id: string; p_note?: string };
        Returns: undefined;
      };
      admin_set_user_suspension: {
        Args: { p_reason?: string; p_report_id?: string; p_suspended: boolean; p_user_id: string };
        Returns: undefined;
      };
      admin_update_report: {
        Args: {
          p_note?: string;
          p_report_id: string;
          p_status: Database["public"]["Enums"]["report_status"];
        };
        Returns: undefined;
      };
      app_schema_version: { Args: Record<PropertyKey, never>; Returns: string };
      get_my_conversations: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          conversation_id: string;
          is_buyer: boolean;
          last_message_at: string;
          last_message_body: string;
          last_message_is_mine: boolean;
          listing_id: string;
          listing_image_path: string;
          listing_price: number;
          listing_status: Database["public"]["Enums"]["listing_status"];
          listing_title: string;
          other_avatar_path: string;
          other_display_name: string;
          other_user_id: string;
          other_username: string;
          unread_count: number;
        }[];
      };
      get_or_create_conversation: { Args: { p_listing_id: string }; Returns: string };
      get_unread_messages_count: { Args: Record<PropertyKey, never>; Returns: number };
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      mark_all_notifications_read: { Args: Record<PropertyKey, never>; Returns: number };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: number };
      register_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string; p_user_agent?: string };
        Returns: undefined;
      };
      reorder_listing_images: {
        Args: { p_image_ids: string[]; p_listing_id: string };
        Returns: undefined;
      };
      sync_listing_images: { Args: { p_images: Json; p_listing_id: string }; Returns: string[] };
    };
    Enums: {
      app_role: "admin";
      listing_condition:
        "new_with_tags" | "new_without_tags" | "very_good" | "good" | "fair" | "for_parts";
      listing_status: "draft" | "active" | "reserved" | "sold" | "withdrawn";
      moderation_action_type:
        | "listing_removed"
        | "listing_restored"
        | "user_suspended"
        | "user_unsuspended"
        | "report_in_review"
        | "report_resolved"
        | "report_dismissed"
        | "message_viewed";
      notification_type:
        | "new_message"
        | "new_follower"
        | "followed_user_listing"
        | "listing_favorited"
        | "listing_removed";
      report_reason:
        | "scam"
        | "prohibited_item"
        | "counterfeit"
        | "inappropriate"
        | "harassment"
        | "spam"
        | "fake_account"
        | "other";
      report_status: "pending" | "in_review" | "resolved" | "dismissed";
      report_target_type: "listing" | "user" | "message";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      listing_condition: [
        "new_with_tags",
        "new_without_tags",
        "very_good",
        "good",
        "fair",
        "for_parts",
      ],
      listing_status: ["draft", "active", "reserved", "sold", "withdrawn"],
      moderation_action_type: [
        "listing_removed",
        "listing_restored",
        "user_suspended",
        "user_unsuspended",
        "report_in_review",
        "report_resolved",
        "report_dismissed",
        "message_viewed",
      ],
      notification_type: [
        "new_message",
        "new_follower",
        "followed_user_listing",
        "listing_favorited",
        "listing_removed",
      ],
      report_reason: [
        "scam",
        "prohibited_item",
        "counterfeit",
        "inappropriate",
        "harassment",
        "spam",
        "fake_account",
        "other",
      ],
      report_status: ["pending", "in_review", "resolved", "dismissed"],
      report_target_type: ["listing", "user", "message"],
    },
  },
} as const;
