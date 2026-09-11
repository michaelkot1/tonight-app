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
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          inviter_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          inviter_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          inviter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          onboarded_at: string | null
          updated_at: string
          watch_with: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          onboarded_at?: string | null
          updated_at?: string
          watch_with?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          onboarded_at?: string | null
          updated_at?: string
          watch_with?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          title_id: string
          updated_at: string
          user_id: string
          verdict: Database["public"]["Enums"]["verdict"]
        }
        Insert: {
          created_at?: string
          id?: string
          title_id: string
          updated_at?: string
          user_id: string
          verdict: Database["public"]["Enums"]["verdict"]
        }
        Update: {
          created_at?: string
          id?: string
          title_id?: string
          updated_at?: string
          user_id?: string
          verdict?: Database["public"]["Enums"]["verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "ratings_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          display_name: string
          service: Database["public"]["Enums"]["streaming_service"]
          tmdb_provider_id: number
        }
        Insert: {
          display_name: string
          service: Database["public"]["Enums"]["streaming_service"]
          tmdb_provider_id: number
        }
        Update: {
          display_name?: string
          service?: Database["public"]["Enums"]["streaming_service"]
          tmdb_provider_id?: number
        }
        Relationships: []
      }
      titles: {
        Row: {
          backdrop_path: string | null
          created_at: string
          director: string | null
          genres: Json
          id: string
          imdb_id: string | null
          imdb_rating: number | null
          keywords: Json
          media_type: Database["public"]["Enums"]["media_type"]
          overview: string | null
          poster_path: string | null
          providers: Json
          providers_fetched_at: string | null
          release_date: string | null
          rt_rating: number | null
          title: string
          tmdb_id: number
          tmdb_popularity: number | null
          tmdb_rating: number | null
          top_cast: Json
          updated_at: string
        }
        Insert: {
          backdrop_path?: string | null
          created_at?: string
          director?: string | null
          genres?: Json
          id?: string
          imdb_id?: string | null
          imdb_rating?: number | null
          keywords?: Json
          media_type: Database["public"]["Enums"]["media_type"]
          overview?: string | null
          poster_path?: string | null
          providers?: Json
          providers_fetched_at?: string | null
          release_date?: string | null
          rt_rating?: number | null
          title: string
          tmdb_id: number
          tmdb_popularity?: number | null
          tmdb_rating?: number | null
          top_cast?: Json
          updated_at?: string
        }
        Update: {
          backdrop_path?: string | null
          created_at?: string
          director?: string | null
          genres?: Json
          id?: string
          imdb_id?: string | null
          imdb_rating?: number | null
          keywords?: Json
          media_type?: Database["public"]["Enums"]["media_type"]
          overview?: string | null
          poster_path?: string | null
          providers?: Json
          providers_fetched_at?: string | null
          release_date?: string | null
          rt_rating?: number | null
          title?: string
          tmdb_id?: number
          tmdb_popularity?: number | null
          tmdb_rating?: number | null
          top_cast?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_services: {
        Row: {
          created_at: string
          service: Database["public"]["Enums"]["streaming_service"]
          user_id: string
        }
        Insert: {
          created_at?: string
          service: Database["public"]["Enums"]["streaming_service"]
          user_id: string
        }
        Update: {
          created_at?: string
          service?: Database["public"]["Enums"]["streaming_service"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { invite_code: string }; Returns: string }
      create_or_get_my_invite: { Args: never; Returns: string }
      is_following: { Args: { target_id: string }; Returns: boolean }
      is_handle_available: { Args: { candidate: string }; Returns: boolean }
    }
    Enums: {
      media_type: "movie" | "tv"
      streaming_service:
        | "netflix"
        | "max"
        | "disney_plus"
        | "prime_video"
        | "hulu"
        | "apple_tv_plus"
        | "peacock"
        | "paramount_plus"
      verdict: "loved" | "liked" | "meh"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      media_type: ["movie", "tv"],
      streaming_service: [
        "netflix",
        "max",
        "disney_plus",
        "prime_video",
        "hulu",
        "apple_tv_plus",
        "peacock",
        "paramount_plus",
      ],
      verdict: ["loved", "liked", "meh"],
    },
  },
} as const
