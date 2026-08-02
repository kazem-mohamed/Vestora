using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyAppApi.Data.Models.DTOs;
using MyAppApi.Services;
using System.Security.Claims;

namespace MyAppApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("Auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (!string.Equals(dto.Password, dto.ConfirmPassword, StringComparison.Ordinal))
            {
                return BadRequest(new { message = "Passwords do not match." });
            }

            var result = await _authService.RegisterAsync(dto);
            return this.ToActionResult(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.LoginAsync(loginDto);
            return this.ToActionResult(result);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.RefreshTokenAsync(dto);
            return this.ToActionResult(result);
        }

        [HttpPost("revoke-token")]
        [Authorize]
        public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequestDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.RevokeTokenAsync(dto);
            return this.ToActionResult(result);
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromBody] RevokeTokenRequestDto? dto)
        {
            var result = await _authService.LogoutAsync(GetCurrentUserId(), dto?.RefreshToken);
            return this.ToActionResult(result);
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.VerifyEmailAsync(dto);
            return this.ToActionResult(result);
        }

        [HttpPost("resend-verification")]
        [EnableRateLimiting("PasswordReset")]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationEmailDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ResendVerificationEmailAsync(dto);
            return this.ToActionResult(result);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ChangePasswordAsync(GetCurrentUserId(), dto);
            return this.ToActionResult(result);
        }

        [HttpPost("forgot-password")]
        [EnableRateLimiting("PasswordReset")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ForgotPasswordAsync(dto);
            return this.ToActionResult(result);
        }

        [HttpPost("reset-password")]
        [EnableRateLimiting("PasswordReset")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ResetPasswordAsync(dto);
            return this.ToActionResult(result);
        }

        private int GetCurrentUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
    }
}
