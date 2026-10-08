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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string
          function_name: string
          id: string
          tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          tokens?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      allowed_emails: {
        Row: {
          created_at: string
          email: string
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      bible_books: {
        Row: {
          abbreviation: string
          book_order: number
          chapter_count: number
          id: number
          name: string
          testament: string
        }
        Insert: {
          abbreviation: string
          book_order: number
          chapter_count: number
          id?: number
          name: string
          testament: string
        }
        Update: {
          abbreviation?: string
          book_order?: number
          chapter_count?: number
          id?: number
          name?: string
          testament?: string
        }
        Relationships: []
      }
      bible_links: {
        Row: {
          book_id: number
          chapter: number
          created_at: string
          id: string
          source_id: string
          source_type: string
          updated_at: string
          user_id: string
          verse_end: number | null
          verse_start: number | null
        }
        Insert: {
          book_id: number
          chapter: number
          created_at?: string
          id?: string
          source_id: string
          source_type: string
          updated_at?: string
          user_id?: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Update: {
          book_id?: number
          chapter?: number
          created_at?: string
          id?: string
          source_id?: string
          source_type?: string
          updated_at?: string
          user_id?: string
          verse_end?: number | null
          verse_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bible_links_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "bible_books"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_verses: {
        Row: {
          book_id: number
          chapter: number
          has_note: boolean
          id: number
          text: string
          translation: string
          verse: number
        }
        Insert: {
          book_id: number
          chapter: number
          has_note?: boolean
          id?: number
          text: string
          translation?: string
          verse: number
        }
        Update: {
          book_id?: number
          chapter?: number
          has_note?: boolean
          id?: number
          text?: string
          translation?: string
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "bible_verses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "bible_books"
            referencedColumns: ["id"]
          },
        ]
      }
      lectio_entries: {
        Row: {
          ai_support: Json | null
          completed_at: string | null
          contemplation: string | null
          created_at: string
          date: string
          id: string
          meditation: string | null
          prayer: string | null
          reading_mark: string | null
          reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_support?: Json | null
          completed_at?: string | null
          contemplation?: string | null
          created_at?: string
          date?: string
          id?: string
          meditation?: string | null
          prayer?: string | null
          reading_mark?: string | null
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          ai_support?: Json | null
          completed_at?: string | null
          contemplation?: string | null
          created_at?: string
          date?: string
          id?: string
          meditation?: string | null
          prayer?: string | null
          reading_mark?: string | null
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_photos: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          photo_text: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          photo_text?: string | null
          storage_path: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          photo_text?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_photos_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_questions: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          lesson_id: string
          question: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          question: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          question?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          clean_transcript: string | null
          created_at: string
          date: string
          extraction: Json | null
          id: string
          raw_transcript: string | null
          theme: string
          updated_at: string
          user_id: string
          user_synthesis: string | null
        }
        Insert: {
          clean_transcript?: string | null
          created_at?: string
          date?: string
          extraction?: Json | null
          id?: string
          raw_transcript?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
          user_synthesis?: string | null
        }
        Update: {
          clean_transcript?: string | null
          created_at?: string
          date?: string
          extraction?: Json | null
          id?: string
          raw_transcript?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
          user_synthesis?: string | null
        }
        Relationships: []
      }
      liturgy_cache: {
        Row: {
          date: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          date: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          date?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      taggings: {
        Row: {
          created_at: string
          id: string
          source_id: string
          source_type: string
          tag_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id: string
          source_type: string
          tag_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string
          source_type?: string
          tag_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taggings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verse_marks: {
        Row: {
          book_id: number
          chapter: number
          created_at: string
          highlight: string | null
          id: string
          note: string | null
          updated_at: string
          user_id: string
          verse: number
        }
        Insert: {
          book_id: number
          chapter: number
          created_at?: string
          highlight?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          verse: number
        }
        Update: {
          book_id?: number
          chapter?: number
          created_at?: string
          highlight?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "verse_marks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "bible_books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "member"
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
      app_role: ["owner", "member"],
    },
  },
} as const
