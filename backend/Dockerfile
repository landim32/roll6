FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first so the layer is cached while only source files change.
COPY SimpleTabletopMap.DTO/SimpleTabletopMap.DTO.csproj SimpleTabletopMap.DTO/
COPY SimpleTabletopMap.Infra.Interfaces/SimpleTabletopMap.Infra.Interfaces.csproj SimpleTabletopMap.Infra.Interfaces/
COPY SimpleTabletopMap.Domain/SimpleTabletopMap.Domain.csproj SimpleTabletopMap.Domain/
COPY SimpleTabletopMap.Infra/SimpleTabletopMap.Infra.csproj SimpleTabletopMap.Infra/
COPY SimpleTabletopMap.Application/SimpleTabletopMap.Application.csproj SimpleTabletopMap.Application/
COPY SimpleTabletopMap.API/SimpleTabletopMap.API.csproj SimpleTabletopMap.API/
RUN dotnet restore SimpleTabletopMap.API/SimpleTabletopMap.API.csproj

COPY . .
RUN dotnet publish SimpleTabletopMap.API/SimpleTabletopMap.API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SimpleTabletopMap.API.dll"]
