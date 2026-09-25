namespace SimpleTabletopMap.DTO.Common;

public class PageQuery
{
    public const int DEFAULT_PAGE_SIZE = 20;
    public const int MAX_PAGE_SIZE = 100;

    private int _page = 1;
    private int _pageSize = DEFAULT_PAGE_SIZE;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value < 1 ? DEFAULT_PAGE_SIZE : Math.Min(value, MAX_PAGE_SIZE);
    }

    public string? Search { get; set; }

    public int Skip => (Page - 1) * PageSize;
}
