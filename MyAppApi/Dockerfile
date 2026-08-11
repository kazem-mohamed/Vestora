# Render has no native .NET runtime, so the API ships as a container.
# Build context is this directory (MyAppApi/), not the repository root.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first, against the project file alone, so a source-only change does
# not invalidate the restored package layer.
COPY MyAppApi/MyAppApi.csproj MyAppApi/
RUN dotnet restore MyAppApi/MyAppApi.csproj

COPY MyAppApi/ MyAppApi/
RUN dotnet publish MyAppApi/MyAppApi.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render assigns the port at run time and expects the process to bind it on all
# interfaces. The shell form is required to expand $PORT; exec keeps dotnet as
# PID 1 so the platform's shutdown signal reaches it.
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} exec dotnet MyAppApi.dll"]
