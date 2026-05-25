export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_broadcasts: {
        Row: {
          actor_id: string
          audience: string
          body: string | null
          created_at: string
          id: string
          link: string | null
          recipient_count: number
          title: string
        }
        Insert: {
          actor_id: string
          audience: string
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          recipient_count?: number
          title: string
        }
        Update: {
          actor_id?: string
          audience?: string
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          recipient_count?: number
          title?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          id: string
          name: string
          region: string
          slug: string
          sort_order: number
        }
        Insert: {
          country: Database["public"]["Enums"]["country_code"]
          created_at?: string
          id?: string
          name: string
          region: string
          slug: string
          sort_order?: number
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          id?: string
          name?: string
          region?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      client_error_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved: boolean
          route: string | null
          severity: string
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved?: boolean
          route?: string | null
          severity?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved?: boolean
          route?: string | null
          severity?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crypto_topups: {
        Row: {
          created_at: string
          credited: boolean
          id: string
          invoice_url: string | null
          np_invoice_id: string | null
          np_payment_id: string | null
          pay_amount: number | null
          pay_currency: string | null
          price_amount_usd: number
          raw_last_ipn: Json | null
          status: Database["public"]["Enums"]["crypto_topup_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credited?: boolean
          id?: string
          invoice_url?: string | null
          np_invoice_id?: string | null
          np_payment_id?: string | null
          pay_amount?: number | null
          pay_currency?: string | null
          price_amount_usd: number
          raw_last_ipn?: Json | null
          status?: Database["public"]["Enums"]["crypto_topup_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credited?: boolean
          id?: string
          invoice_url?: string | null
          np_invoice_id?: string | null
          np_payment_id?: string | null
          pay_amount?: number | null
          pay_currency?: string | null
          price_amount_usd?: number
          raw_last_ipn?: Json | null
          status?: Database["public"]["Enums"]["crypto_topup_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_slots: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          listing_id: string | null
          position: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          position: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          position?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      listing_events: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          metadata: Json
          type: Database["public"]["Enums"]["listing_event_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          metadata?: Json
          type: Database["public"]["Enums"]["listing_event_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          metadata?: Json
          type?: Database["public"]["Enums"]["listing_event_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_promotions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          listing_id: string
          payment_id: string | null
          starts_at: string
          type: Database["public"]["Enums"]["promotion_type"]
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          listing_id: string
          payment_id?: string | null
          starts_at?: string
          type: Database["public"]["Enums"]["promotion_type"]
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          listing_id?: string
          payment_id?: string | null
          starts_at?: string
          type?: Database["public"]["Enums"]["promotion_type"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_promotions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          bumped_at: string
          category_id: string
          city_id: string
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at: string
          description: string
          expires_at: string
          id: string
          item_age: string
          search_tsv: unknown
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          bumped_at?: string
          category_id: string
          city_id: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description: string
          expires_at?: string
          id?: string
          item_age?: string
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          bumped_at?: string
          category_id?: string
          city_id?: string
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string
          expires_at?: string
          id?: string
          item_age?: string
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          archived_by: string[]
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          muted_by: string[]
          seller_id: string
        }
        Insert: {
          archived_by?: string[]
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          muted_by?: string[]
          seller_id: string
        }
        Update: {
          archived_by?: string[]
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          muted_by?: string[]
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_on_expiring: boolean
          email_on_message: boolean
          email_on_offer: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_on_expiring?: boolean
          email_on_message?: boolean
          email_on_offer?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_on_expiring?: boolean
          email_on_message?: boolean
          email_on_offer?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          listing_id: string | null
          promotion_type: Database["public"]["Enums"]["promotion_type"] | null
          provider: string
          provider_session_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          promotion_type?: Database["public"]["Enums"]["promotion_type"] | null
          provider: string
          provider_session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          promotion_type?: Database["public"]["Enums"]["promotion_type"] | null
          provider?: string
          provider_session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city_id: string | null
          country: Database["public"]["Enums"]["country_code"] | null
          created_at: string
          display_name: string
          email_verified_at: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          display_name: string
          email_verified_at?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          display_name?: string
          email_verified_at?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          last_notified_at: string
          name: string
          notify: boolean
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string
          name: string
          notify?: boolean
          query?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string
          name?: string
          notify?: boolean
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      server_fn_logs: {
        Row: {
          created_at: string
          duration_ms: number
          error: string | null
          fn_name: string
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          fn_name: string
          id?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          fn_name?: string
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_banners: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          message: string
          starts_at: string
          updated_at: string
          variant: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          message: string
          starts_at?: string
          updated_at?: string
          variant?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          message?: string
          starts_at?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          bump_days: number
          bump_price_usd: number
          featured_days: number
          featured_price_usd: number
          id: string
          maintenance_message: string
          maintenance_mode: boolean
          site_name: string
          support_email: string
          updated_at: string
        }
        Insert: {
          bump_days?: number
          bump_price_usd?: number
          featured_days?: number
          featured_price_usd?: number
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          site_name?: string
          support_email?: string
          updated_at?: string
        }
        Update: {
          bump_days?: number
          bump_price_usd?: number
          featured_days?: number
          featured_price_usd?: number
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          site_name?: string
          support_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      thread_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_usd: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
        }
        Insert: {
          amount_usd: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
        }
        Update: {
          amount_usd?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_usd: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_wallet: {
        Args: { _amount: number; _description: string; _user_id: string }
        Returns: number
      }
      credit_wallet: {
        Args: {
          _amount: number
          _description: string
          _reference: string
          _user_id: string
        }
        Returns: number
      }
      debit_wallet: {
        Args: {
          _amount: number
          _description: string
          _reference: string
          _user_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_view: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      log_admin_action: {
        Args: {
          _action: string
          _actor: string
          _metadata: Json
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin"
      country_code: "US" | "UK" | "CA"
      crypto_topup_status:
        | "waiting"
        | "confirming"
        | "confirmed"
        | "sending"
        | "partially_paid"
        | "finished"
        | "failed"
        | "expired"
        | "refunded"
      listing_condition:
        | "new"
        | "like_new"
        | "good"
        | "fair"
        | "poor"
        | "not_applicable"
      listing_event_type: "view" | "favorite" | "message" | "contact_reveal"
      listing_status: "draft" | "active" | "sold" | "expired" | "removed"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      promotion_type: "featured" | "bump" | "highlight"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      wallet_tx_type: "topup" | "spend" | "refund" | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "moderator", "admin"],
      country_code: ["US", "UK", "CA"],
      crypto_topup_status: [
        "waiting",
        "confirming",
        "confirmed",
        "sending",
        "partially_paid",
        "finished",
        "failed",
        "expired",
        "refunded",
      ],
      listing_condition: [
        "new",
        "like_new",
        "good",
        "fair",
        "poor",
        "not_applicable",
      ],
      listing_event_type: ["view", "favorite", "message", "contact_reveal"],
      listing_status: ["draft", "active", "sold", "expired", "removed"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      promotion_type: ["featured", "bump", "highlight"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      wallet_tx_type: ["topup", "spend", "refund", "adjustment"],
    },
  },
} as const
