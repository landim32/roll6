FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first so the layer is cached while only source files change.
COPY Roll6.DTO/Roll6.DTO.csproj Roll6.DTO/
COPY Roll6.Infra.Interfaces/Roll6.Infra.Interfaces.csproj Roll6.Infra.Interfaces/
COPY Roll6.Domain/Roll6.Domain.csproj Roll6.Domain/
COPY Roll6.Infra/Roll6.Infra.csproj Roll6.Infra/
COPY Roll6.Application/Roll6.Application.csproj Roll6.Application/
COPY Roll6.API/Roll6.API.csproj Roll6.API/
RUN dotnet restore Roll6.API/Roll6.API.csproj

COPY . .
RUN dotnet publish Roll6.API/Roll6.API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Roll6.API.dll"]
