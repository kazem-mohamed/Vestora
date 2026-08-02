using MyAppApi.Data.Models.DTOs;

namespace MyAppApi.Services
{
    public interface IAuthService
    {
        Task<ServiceResult<ApiMessageDto>> RegisterAsync(RegisterDto dto);

        Task<ServiceResult<LoginResponseDto>> LoginAsync(UserLoginDto dto);

        Task<ServiceResult<LoginResponseDto>> RefreshTokenAsync(RefreshTokenRequestDto dto);

        Task<ServiceResult<ApiMessageDto>> RevokeTokenAsync(RevokeTokenRequestDto dto);

        Task<ServiceResult<ApiMessageDto>> LogoutAsync(int userId, string? refreshToken);

        Task<ServiceResult<ApiMessageDto>> VerifyEmailAsync(VerifyEmailDto dto);

        Task<ServiceResult<ApiMessageDto>> ResendVerificationEmailAsync(ResendVerificationEmailDto dto);

        Task<ServiceResult<ApiMessageDto>> ChangePasswordAsync(int userId, ChangePasswordDto dto);

        Task<ServiceResult<ApiMessageDto>> ForgotPasswordAsync(ForgotPasswordDto dto);

        Task<ServiceResult<ApiMessageDto>> ResetPasswordAsync(ResetPasswordDto dto);
    }
}
