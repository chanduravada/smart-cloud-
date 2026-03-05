-- Enable trigram extension for fuzzy search FIRST
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  storage_used BIGINT NOT NULL DEFAULT 0,
  storage_limit BIGINT NOT NULL DEFAULT 5368709120,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create files table for metadata
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  file_hash TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_classification JSONB,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  duplicate_of UUID REFERENCES public.files(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Files policies
CREATE POLICY "Users can view their own files"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON public.files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_file_hash ON public.files(file_hash);
CREATE INDEX idx_files_category ON public.files(category);
CREATE INDEX idx_files_tags ON public.files USING GIN(tags);
CREATE INDEX idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX idx_files_name_trgm ON public.files USING GIN(name gin_trgm_ops);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update storage used
CREATE OR REPLACE FUNCTION public.update_storage_used()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET storage_used = storage_used + NEW.size
    WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET storage_used = storage_used - OLD.size
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for storage tracking
CREATE TRIGGER update_storage_on_file_change
  AFTER INSERT OR DELETE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_storage_used();

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-files',
  'user-files',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- Storage policies
CREATE POLICY "Users can view their own files in storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);