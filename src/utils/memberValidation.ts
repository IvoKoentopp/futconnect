import { supabase } from '@/integrations/supabase/client';

export interface MemberValidationResult {
  isValid: boolean;
  error?: string;
}

export async function validateUniqueEmail(email: string, currentMemberId?: string): Promise<MemberValidationResult> {
  try {
    const { data: existingEmail, error: emailError } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)
      .neq('id', currentMemberId || '')
      .maybeSingle();

    if (emailError) {
      console.error('Error checking email:', emailError);
      return {
        isValid: false,
        error: 'Erro ao verificar email'
      };
    }

    if (existingEmail) {
      return {
        isValid: false,
        error: 'Este email já está cadastrado no sistema. Cada pessoa deve ter um email único.'
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error in email validation:', error);
    return {
      isValid: false,
      error: 'Erro ao verificar email'
    };
  }
}

export async function validateUniqueNickname(nickname: string, clubId: string, currentMemberId?: string): Promise<MemberValidationResult> {
  try {
    const { data: existingNickname, error: nicknameError } = await supabase
      .from('members')
      .select('id, nickname')
      .eq('club_id', clubId)
      .neq('id', currentMemberId || '')
      .ilike('nickname', nickname)
      .maybeSingle();

    if (nicknameError) {
      console.error('Error checking nickname:', nicknameError);
      return {
        isValid: false,
        error: 'Erro ao verificar apelido'
      };
    }

    if (existingNickname) {
      return {
        isValid: false,
        error: `Este apelido já está em uso no clube como "${existingNickname.nickname}". Não é permitido usar o mesmo apelido com variações de maiúsculas/minúsculas.`
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error in nickname validation:', error);
    return {
      isValid: false,
      error: 'Erro ao verificar apelido'
    };
  }
}

export async function validateMemberData(data: {
  email: string;
  nickname: string;
  clubId: string;
  currentMemberId?: string;
}): Promise<MemberValidationResult> {
  // Valida email
  const emailValidation = await validateUniqueEmail(data.email, data.currentMemberId);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  // Valida apelido
  const nicknameValidation = await validateUniqueNickname(data.nickname, data.clubId, data.currentMemberId);
  if (!nicknameValidation.isValid) {
    return nicknameValidation;
  }

  return { isValid: true };
}
